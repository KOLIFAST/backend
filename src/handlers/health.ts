import type { Request, Response } from "express";
import healthRepository from "../repositories/health.js";


async function getDbHealthStatus(_: Request, res: Response) {
  try {
    const version = await healthRepository.getDbVersion()
    res.status(200).json({
      dbHealthy: true,
      version: version
    })
  } catch (error) {
    console.log(`Error while querying for DB version ${error}`)
    res.status(500).json({
      dbHealthy: false,
    })
  }
}

const healthHandler = {
  getDbHealthStatus
}

export default healthHandler
