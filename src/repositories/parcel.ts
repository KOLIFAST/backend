import sql from "../db/index.js"
import type { DBError } from "../errors/errors.js"
import type { Parcel, ParcelAddress, ParcelTimeline } from "../models/models.js"
import { Err, Ok, type Result } from "../types/result.js"

// ==================== PARCELS ====================

/**
 * Insert a new parcel
 */
export async function insert_parcel(parcel: {
  id: string
  user_id: string
  type: 'send' | 'receive'
  parcel_type: 'light' | 'medium' | 'ultra_heavy'
  weight?: number | undefined
  description: string
  parcel_count: number
  delivery_type: 'grouped' | 'express'
  waiting_hours?: number | undefined
  estimated_cost?: number | undefined
  savings_amount?: number | undefined
}): Promise<Result<{ tracking_number: string }, DBError>> {
  try {
    // Generate tracking number using database function
    const [result] = await sql<{ tracking_number: string }[]>`
      INSERT INTO parcels (
        id, user_id, tracking_number, type, parcel_type, weight,
        description, parcel_count, delivery_type, waiting_hours,
        estimated_cost, savings_amount, status
      ) VALUES (
        ${parcel.id},
        ${parcel.user_id},
        generate_tracking_number(),
        ${parcel.type},
        ${parcel.parcel_type},
        ${parcel.weight || null},
        ${parcel.description},
        ${parcel.parcel_count},
        ${parcel.delivery_type},
        ${parcel.waiting_hours || null},
        ${parcel.estimated_cost || null},
        ${parcel.savings_amount || null},
        'pending'
      )
      RETURNING tracking_number
    `

    if (!result) {
      return Err({
        type: "DatabaseError",
        message: "Failed to insert parcel - no tracking number returned"
      })
    }

    return Ok({ tracking_number: result.tracking_number })
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error inserting parcel: ${String(err)}`
    })
  }
}

/**
 * Get parcel by ID
 */
export async function get_parcel_by_id(parcel_id: string): Promise<Result<Parcel, DBError>> {
  try {
    const [parcel] = await sql<Parcel[]>`
      SELECT * FROM parcels WHERE id = ${parcel_id}
    `
    if (!parcel) {
      return Err({
        type: "NotFoundError",
        message: `Parcel with id ${parcel_id} not found`
      })
    }
    return Ok(parcel)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching parcel: ${String(err)}`
    })
  }
}

/**
 * Get parcel by tracking number
 */
export async function get_parcel_by_tracking_number(tracking_number: string): Promise<Result<Parcel, DBError>> {
  try {
    const [parcel] = await sql<Parcel[]>`
      SELECT * FROM parcels WHERE tracking_number = ${tracking_number}
    `
    if (!parcel) {
      return Err({
        type: "NotFoundError",
        message: `Parcel with tracking number ${tracking_number} not found`
      })
    }
    return Ok(parcel)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching parcel: ${String(err)}`
    })
  }
}

/**
 * Get all parcels for a user with pagination and filtering
 */
export async function get_parcels_by_user(
  user_id: string,
  filters?: {
    status?: string
    type?: 'send' | 'receive'
    page?: number
    limit?: number
  }
): Promise<Result<{ parcels: Parcel[]; total: number }, DBError>> {
  try {
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    // Build WHERE clause conditions
    const hasStatus = filters?.status !== undefined
    const hasType = filters?.type !== undefined

    // Get total count
    let countResult
    if (hasStatus && hasType) {
      [countResult] = await sql<{ count: number }[]>`SELECT COUNT(*) as count FROM parcels WHERE user_id = ${user_id} AND status = ${filters.status!} AND type = ${filters.type!}`
    } else if (hasStatus) {
      [countResult] = await sql<{ count: number }[]>`SELECT COUNT(*) as count FROM parcels WHERE user_id = ${user_id} AND status = ${filters.status!}`
    } else if (hasType) {
      [countResult] = await sql<{ count: number }[]>`SELECT COUNT(*) as count FROM parcels WHERE user_id = ${user_id} AND type = ${filters.type!}`
    } else {
      [countResult] = await sql<{ count: number }[]>`SELECT COUNT(*) as count FROM parcels WHERE user_id = ${user_id}`
    }

    if (!countResult) {
      return Err({
        type: "DatabaseError",
        message: "Failed to get parcel count"
      })
    }

    // Get paginated results
    let parcels
    if (hasStatus && hasType) {
      parcels = await sql<Parcel[]>`SELECT * FROM parcels WHERE user_id = ${user_id} AND status = ${filters.status!} AND type = ${filters.type!} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    } else if (hasStatus) {
      parcels = await sql<Parcel[]>`SELECT * FROM parcels WHERE user_id = ${user_id} AND status = ${filters.status!} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    } else if (hasType) {
      parcels = await sql<Parcel[]>`SELECT * FROM parcels WHERE user_id = ${user_id} AND type = ${filters.type!} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    } else {
      parcels = await sql<Parcel[]>`SELECT * FROM parcels WHERE user_id = ${user_id} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    }

    return Ok({
      parcels,
      total: Number(countResult.count)
    })
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching parcels: ${String(err)}`
    })
  }
}

/**
 * Update parcel status
 */
export async function update_parcel_status(
  parcel_id: string,
  status: Parcel['status']
): Promise<Result<void, DBError>> {
  try {
    await sql`
      UPDATE parcels
      SET status = ${status},
          pickup_completed_at = CASE WHEN ${status} = 'picked_up' THEN NOW() ELSE pickup_completed_at END,
          delivery_started_at = CASE WHEN ${status} = 'in_transit' THEN NOW() ELSE delivery_started_at END,
          delivered_at = CASE WHEN ${status} = 'delivered' THEN NOW() ELSE delivered_at END,
          cancelled_at = CASE WHEN ${status} = 'cancelled' THEN NOW() ELSE cancelled_at END
      WHERE id = ${parcel_id}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error updating parcel status: ${String(err)}`
    })
  }
}

/**
 * Assign driver to parcel
 */
export async function assign_driver_to_parcel(
  parcel_id: string,
  driver_id: string
): Promise<Result<void, DBError>> {
  try {
    await sql`
      UPDATE parcels
      SET driver_id = ${driver_id},
          assigned_at = NOW(),
          status = 'confirmed'
      WHERE id = ${parcel_id}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error assigning driver: ${String(err)}`
    })
  }
}

/**
 * Update parcel payment status
 */
export async function update_parcel_payment_status(
  parcel_id: string,
  is_paid: boolean,
  final_cost?: number
): Promise<Result<void, DBError>> {
  try {
    await sql`
      UPDATE parcels
      SET is_paid = ${is_paid},
          final_cost = ${final_cost || sql`final_cost`}
      WHERE id = ${parcel_id}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error updating payment status: ${String(err)}`
    })
  }
}

/**
 * Cancel parcel
 */
export async function cancel_parcel(
  parcel_id: string,
  reason: string
): Promise<Result<void, DBError>> {
  try {
    await sql`
      UPDATE parcels
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancellation_reason = ${reason}
      WHERE id = ${parcel_id}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error cancelling parcel: ${String(err)}`
    })
  }
}

// ==================== PARCEL ADDRESSES ====================

/**
 * Insert parcel addresses (pickup and/or delivery)
 */
export async function insert_parcel_addresses(
  addresses: Array<{
    id: string
    parcel_id: string
    type: 'pickup' | 'delivery'
    address: string
    latitude?: number | undefined
    longitude?: number | undefined
    contact_name: string
    contact_number: string
    order_index: number
  }>
): Promise<Result<void, DBError>> {
  try {
    if (addresses.length === 0) return Ok(undefined)

    const rows = addresses.map(addr => ({
      id: addr.id,
      parcel_id: addr.parcel_id,
      type: addr.type,
      address: addr.address,
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
      contact_name: addr.contact_name,
      contact_number: addr.contact_number,
      order_index: addr.order_index
    }))

    await sql`
      INSERT INTO parcel_addresses ${sql(rows)}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error inserting parcel addresses: ${String(err)}`
    })
  }
}

/**
 * Get all addresses for a parcel
 */
export async function get_parcel_addresses(parcel_id: string): Promise<Result<ParcelAddress[], DBError>> {
  try {
    const addresses = await sql<ParcelAddress[]>`
      SELECT * FROM parcel_addresses
      WHERE parcel_id = ${parcel_id}
      ORDER BY type, order_index
    `
    return Ok(addresses)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching parcel addresses: ${String(err)}`
    })
  }
}

/**
 * Mark address as completed
 */
export async function mark_address_completed(address_id: string): Promise<Result<void, DBError>> {
  try {
    await sql`
      UPDATE parcel_addresses
      SET is_completed = true,
          completed_at = NOW()
      WHERE id = ${address_id}
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error marking address as completed: ${String(err)}`
    })
  }
}

// ==================== PARCEL TIMELINE ====================

/**
 * Get timeline for a parcel
 */
export async function get_parcel_timeline(parcel_id: string): Promise<Result<ParcelTimeline[], DBError>> {
  try {
    const timeline = await sql<ParcelTimeline[]>`
      SELECT * FROM parcel_timeline
      WHERE parcel_id = ${parcel_id}
      ORDER BY created_at ASC
    `
    return Ok(timeline)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error fetching parcel timeline: ${String(err)}`
    })
  }
}

/**
 * Add manual timeline entry
 */
export async function add_timeline_entry(entry: {
  id: string
  parcel_id: string
  status: string
  description?: string
  latitude?: number
  longitude?: number
  triggered_by?: string
}): Promise<Result<void, DBError>> {
  try {
    await sql`
      INSERT INTO parcel_timeline (
        id, parcel_id, status, description, latitude, longitude, triggered_by
      ) VALUES (
        ${entry.id},
        ${entry.parcel_id},
        ${entry.status},
        ${entry.description || null},
        ${entry.latitude || null},
        ${entry.longitude || null},
        ${entry.triggered_by || null}
      )
    `
    return Ok(undefined)
  } catch (err: unknown) {
    return Err({
      type: "DatabaseError",
      message: `Error adding timeline entry: ${String(err)}`
    })
  }
}
