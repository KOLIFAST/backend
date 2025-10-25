import type { Request, Response } from "express"
import z from "zod"
import { generate_uuid, parse_invalid_fields } from "../utils/utils.js"
import {
  insert_parcel,
  insert_parcel_addresses,
  get_parcels_by_user,
  get_parcel_by_id,
  get_parcel_addresses,
  get_parcel_timeline,
  update_parcel_status
} from "../repositories/parcel.js"
import { calculateDeliveryCost, calculateTotalDistance } from "../utils/pricing.js"
import type { ZodIssue } from "zod/v3"

/**
 * Handler: Send a parcel
 * POST /parcels/send
 */
export async function handle_send_parcel(req: Request, res: Response) {
  try {
    const user_id = req.user!.id

    // Validate request body
    const parseResult = z.object({
      pickupAddress: z.object({
        address: z.string().nonempty(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        contactNumber: z.string().nonempty()
      }),
      deliveryAddresses: z.array(z.object({
        address: z.string().nonempty(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        contactNumber: z.string().nonempty(),
        contactName: z.string().nonempty()
      })).min(1),
      parcelType: z.enum(['light', 'medium', 'ultra_heavy']),
      weight: z.number().optional(),
      description: z.string().nonempty(),
      parcelCount: z.number().min(1),
      deliveryType: z.enum(['grouped', 'express']),
      waitingHours: z.number().min(2).max(24).optional()
    }).safeParse(req.body)

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        invalid_fields: parse_invalid_fields(parseResult.error.issues as ZodIssue[])
      })
    }

    const data = parseResult.data

    // Validate waiting hours for grouped delivery
    if (data.deliveryType === 'grouped' && !data.waitingHours) {
      return res.status(400).json({
        error: "Waiting hours required for grouped delivery"
      })
    }

    // Calculate distance if coordinates provided
    let estimatedCost: number | undefined
    let savingsAmount: number | undefined

    if (data.pickupAddress.latitude && data.pickupAddress.longitude &&
        data.deliveryAddresses.every(addr => addr.latitude && addr.longitude)) {
      const totalDistance = calculateTotalDistance(
        {
          latitude: data.pickupAddress.latitude,
          longitude: data.pickupAddress.longitude
        },
        data.deliveryAddresses.map(addr => ({
          latitude: addr.latitude!,
          longitude: addr.longitude!
        }))
      )

      const pricingResult = calculateDeliveryCost({
        parcelType: data.parcelType,
        ...(data.weight && { weight: data.weight }),
        deliveryType: data.deliveryType,
        ...(data.waitingHours && { waitingHours: data.waitingHours }),
        distance: totalDistance,
        destinationCount: data.deliveryAddresses.length
      })

      estimatedCost = pricingResult.finalCost
      savingsAmount = pricingResult.savingsAmount
    }

    // Create parcel
    const parcel_id = generate_uuid()
    const parcelResult = await insert_parcel({
      id: parcel_id,
      user_id,
      type: 'send',
      parcel_type: data.parcelType,
      ...(data.weight && { weight: data.weight }),
      description: data.description,
      parcel_count: data.parcelCount,
      delivery_type: data.deliveryType,
      ...(data.waitingHours && { waiting_hours: data.waitingHours }),
      ...(estimatedCost && { estimated_cost: estimatedCost }),
      ...(savingsAmount && { savings_amount: savingsAmount })
    })

    if (!parcelResult.ok) {
      console.error(parcelResult.error.message)
      return res.status(500).json({ error: "Failed to create parcel" })
    }

    // Insert addresses
    const addresses = [
      {
        id: generate_uuid(),
        parcel_id,
        type: 'pickup' as const,
        address: data.pickupAddress.address,
        latitude: data.pickupAddress.latitude || undefined,
        longitude: data.pickupAddress.longitude || undefined,
        contact_name: req.user!.full_name || 'User',
        contact_number: data.pickupAddress.contactNumber,
        order_index: 1
      },
      ...data.deliveryAddresses.map((addr, index) => ({
        id: generate_uuid(),
        parcel_id,
        type: 'delivery' as const,
        address: addr.address,
        latitude: addr.latitude || undefined,
        longitude: addr.longitude || undefined,
        contact_name: addr.contactName,
        contact_number: addr.contactNumber,
        order_index: index + 1
      }))
    ]

    const addressResult = await insert_parcel_addresses(addresses)
    if (!addressResult.ok) {
      console.error(addressResult.error.message)
      // Continue anyway, addresses can be added later
    }

    return res.status(201).json({
      message: "Parcel created successfully",
      data: {
        parcelId: parcel_id,
        trackingNumber: parcelResult.value.tracking_number,
        estimatedCost,
        savingsAmount
      }
    })
  } catch (err: unknown) {
    console.error('Error creating parcel:', err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Handler: Receive a parcel
 * POST /parcels/receive
 */
export async function handle_receive_parcel(req: Request, res: Response) {
  try {
    const user_id = req.user!.id

    // Validate request body
    const parseResult = z.object({
      pickupAddresses: z.array(z.object({
        address: z.string().nonempty(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        contactNumber: z.string().nonempty(),
        contactName: z.string().nonempty()
      })).min(1),
      deliveryAddress: z.object({
        address: z.string().nonempty(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        contactNumber: z.string().nonempty()
      }),
      parcelType: z.enum(['light', 'medium', 'ultra_heavy']),
      weight: z.number().optional(),
      description: z.string().nonempty(),
      parcelCount: z.number().min(1),
      deliveryType: z.enum(['grouped', 'express']),
      waitingHours: z.number().min(2).max(24).optional()
    }).safeParse(req.body)

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        invalid_fields: parse_invalid_fields(parseResult.error.issues as ZodIssue[])
      })
    }

    const data = parseResult.data

    // Validate waiting hours for grouped delivery
    if (data.deliveryType === 'grouped' && !data.waitingHours) {
      return res.status(400).json({
        error: "Waiting hours required for grouped delivery"
      })
    }

    // Calculate distance if coordinates provided
    let estimatedCost: number | undefined
    let savingsAmount: number | undefined

    if (data.deliveryAddress.latitude && data.deliveryAddress.longitude &&
        data.pickupAddresses.every(addr => addr.latitude && addr.longitude)) {
      // For receive, calculate from first pickup to delivery
      const firstPickup = data.pickupAddresses[0]
      if (firstPickup) {
        const totalDistance = calculateTotalDistance(
          { latitude: firstPickup.latitude!, longitude: firstPickup.longitude! },
          [{ latitude: data.deliveryAddress.latitude, longitude: data.deliveryAddress.longitude }]
        )

        const pricingResult = calculateDeliveryCost({
          parcelType: data.parcelType,
          ...(data.weight && { weight: data.weight }),
          deliveryType: data.deliveryType,
          ...(data.waitingHours && { waitingHours: data.waitingHours }),
          distance: totalDistance,
          destinationCount: data.pickupAddresses.length
        })

        estimatedCost = pricingResult.finalCost
        savingsAmount = pricingResult.savingsAmount
      }
    }

    // Create parcel
    const parcel_id = generate_uuid()
    const parcelResult = await insert_parcel({
      id: parcel_id,
      user_id,
      type: 'receive',
      parcel_type: data.parcelType,
      ...(data.weight && { weight: data.weight }),
      description: data.description,
      parcel_count: data.parcelCount,
      delivery_type: data.deliveryType,
      ...(data.waitingHours && { waiting_hours: data.waitingHours }),
      ...(estimatedCost && { estimated_cost: estimatedCost }),
      ...(savingsAmount && { savings_amount: savingsAmount })
    })

    if (!parcelResult.ok) {
      console.error(parcelResult.error.message)
      return res.status(500).json({ error: "Failed to create parcel" })
    }

    // Insert addresses
    const addresses = [
      ...data.pickupAddresses.map((addr, index) => ({
        id: generate_uuid(),
        parcel_id,
        type: 'pickup' as const,
        address: addr.address,
        latitude: addr.latitude || undefined,
        longitude: addr.longitude || undefined,
        contact_name: addr.contactName,
        contact_number: addr.contactNumber,
        order_index: index + 1
      })),
      {
        id: generate_uuid(),
        parcel_id,
        type: 'delivery' as const,
        address: data.deliveryAddress.address,
        latitude: data.deliveryAddress.latitude || undefined,
        longitude: data.deliveryAddress.longitude || undefined,
        contact_name: req.user!.full_name || 'User',
        contact_number: data.deliveryAddress.contactNumber,
        order_index: 1
      }
    ]

    const addressResult = await insert_parcel_addresses(addresses)
    if (!addressResult.ok) {
      console.error(addressResult.error.message)
    }

    return res.status(201).json({
      message: "Parcel request created successfully",
      data: {
        parcelId: parcel_id,
        trackingNumber: parcelResult.value.tracking_number,
        estimatedCost,
        savingsAmount
      }
    })
  } catch (err: unknown) {
    console.error('Error creating receive parcel:', err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Handler: List user's parcels
 * GET /parcels/list
 */
export async function handle_list_parcels(req: Request, res: Response) {
  try {
    const user_id = req.user!.id

    // Parse query parameters
    const status = req.query.status as string | undefined
    const type = req.query.type as 'send' | 'receive' | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const result = await get_parcels_by_user(user_id, {
      ...(status && { status }),
      ...(type && { type }),
      page,
      limit
    })

    if (!result.ok) {
      console.error(result.error.message)
      return res.status(500).json({ error: "Failed to fetch parcels" })
    }

    return res.status(200).json({
      data: {
        parcels: result.value.parcels,
        pagination: {
          page,
          limit,
          total: result.value.total,
          totalPages: Math.ceil(result.value.total / limit)
        }
      }
    })
  } catch (err: unknown) {
    console.error('Error listing parcels:', err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Handler: Get parcel details
 * GET /parcels/:id
 */
export async function handle_parcel_details(req: Request, res: Response) {
  try {
    const parcel_id = req.params.id
    if (!parcel_id) {
      return res.status(400).json({ error: "Parcel ID is required" })
    }

    const user_id = req.user!.id

    // Get parcel
    const parcelResult = await get_parcel_by_id(parcel_id)
    if (!parcelResult.ok) {
      return res.status(404).json({ error: "Parcel not found" })
    }

    const parcel = parcelResult.value

    // Check ownership (or if user is assigned driver)
    if (parcel.user_id !== user_id && parcel.driver_id !== user_id) {
      return res.status(403).json({ error: "Access denied" })
    }

    // Get addresses
    const addressesResult = await get_parcel_addresses(parcel.id)
    const addresses = addressesResult.ok ? addressesResult.value : []

    // Get timeline
    const timelineResult = await get_parcel_timeline(parcel.id)
    const timeline = timelineResult.ok ? timelineResult.value : []

    // Separate pickup and delivery addresses
    const pickupAddresses = addresses.filter(addr => addr.type === 'pickup')
    const deliveryAddresses = addresses.filter(addr => addr.type === 'delivery')

    return res.status(200).json({
      data: {
        parcel,
        pickupAddresses,
        deliveryAddresses,
        timeline
      }
    })
  } catch (err: unknown) {
    console.error('Error fetching parcel details:', err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Handler: Track parcel (real-time tracking)
 * GET /parcels/:id/track
 */
export async function handle_parcel_tracking(req: Request, res: Response) {
  try {
    const parcel_id = req.params.id
    if (!parcel_id) {
      return res.status(400).json({ error: "Parcel ID is required" })
    }

    // Get parcel
    const parcelResult = await get_parcel_by_id(parcel_id)
    if (!parcelResult.ok) {
      return res.status(404).json({ error: "Parcel not found" })
    }

    const parcel = parcelResult.value

    // Get latest timeline entry with location
    const timelineResult = await get_parcel_timeline(parcel_id)
    if (!timelineResult.ok) {
      return res.status(500).json({ error: "Failed to fetch tracking info" })
    }

    const timeline = timelineResult.value
    const latestLocation = timeline
      .filter(entry => entry.latitude && entry.longitude)
      .pop()

    return res.status(200).json({
      data: {
        trackingNumber: parcel.tracking_number,
        status: parcel.status,
        currentLocation: latestLocation ? {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          lastUpdate: latestLocation.created_at
        } : null,
        driverInfo: parcel.driver_id ? {
          // Would need to join with users table for driver info
          driverId: parcel.driver_id
        } : null
      }
    })
  } catch (err: unknown) {
    console.error('Error tracking parcel:', err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Handler: Update parcel status (Driver or Admin only)
 * PUT /parcels/:id
 */
export async function handle_update_parcel_status(req: Request, res: Response) {
  try {
    const parcel_id = req.params.id
    if (!parcel_id) {
      return res.status(400).json({ error: "Parcel ID is required" })
    }

    const user_id = req.user!.id

    // Validate request body
    const parseResult = z.object({
      status: z.enum(['pending', 'confirmed', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
    }).safeParse(req.body)

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid status",
        invalid_fields: parse_invalid_fields(parseResult.error.issues as ZodIssue[])
      })
    }

    const { status } = parseResult.data

    // Get parcel to check permissions
    const parcelResult = await get_parcel_by_id(parcel_id)
    if (!parcelResult.ok) {
      return res.status(404).json({ error: "Parcel not found" })
    }

    const parcel = parcelResult.value

    // Check if user is driver or admin
    const isDriver = req.user!.user_type === 'driver' && parcel.driver_id === user_id
    const isAdmin = req.user!.user_type === 'admin'

    if (!isDriver && !isAdmin) {
      return res.status(403).json({ error: "Only assigned driver or admin can update status" })
    }

    // Update status
    const updateResult = await update_parcel_status(parcel_id, status)
    if (!updateResult.ok) {
      console.error(updateResult.error.message)
      return res.status(500).json({ error: "Failed to update status" })
    }

    return res.status(200).json({
      message: "Parcel status updated successfully",
      data: { status }
    })
  } catch (err: unknown) {
    console.error('Error updating parcel status:', err)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Handler: Report a problem with parcel
 * POST /parcels/:id/report
 */
export async function handle_report_problem(req: Request, res: Response) {
  try {
    const parcel_id = req.params.id
    if (!parcel_id) {
      return res.status(400).json({ error: "Parcel ID is required" })
    }

    const user_id = req.user!.id

    // Validate request body
    const parseResult = z.object({
      reportText: z.string().nonempty()
    }).safeParse(req.body)

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Report text is required",
        invalid_fields: parse_invalid_fields(parseResult.error.issues as ZodIssue[])
      })
    }

    const { reportText: _reportText } = parseResult.data

    // Get parcel to check ownership
    const parcelResult = await get_parcel_by_id(parcel_id)
    if (!parcelResult.ok) {
      return res.status(404).json({ error: "Parcel not found" })
    }

    const parcel = parcelResult.value

    // Check if user owns this parcel
    if (parcel.user_id !== user_id) {
      return res.status(403).json({ error: "Access denied" })
    }

    // TODO: Create support ticket (table not yet implemented)
    // For now, just return success
    const ticketId = generate_uuid()

    return res.status(200).json({
      message: "Problem reported successfully. Our support team will contact you soon.",
      data: {
        ticketId,
        parcelId: parcel_id,
        trackingNumber: parcel.tracking_number
      }
    })
  } catch (err: unknown) {
    console.error('Error reporting problem:', err)
    return res.status(500).json({ error: "Internal server error" })
  }
}
