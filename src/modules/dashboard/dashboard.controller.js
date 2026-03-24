import * as dashboardService from "./dashboard.service.js";
import { ApiResponse, ApiError } from "../../utils/response.js";

/**
  @param {object} query 
  @returns {object} 
  @throws {ApiError}
 */
const validateDateRange = (query) => {
	const { from, to } = query;


	if (from && isNaN(Date.parse(from))) {
		throw new ApiError(400, "Invalid 'from' date format");
	}
	if (to && isNaN(Date.parse(to))) {
		throw new ApiError(400, "Invalid 'to' date format");
	}

	const { startDate, endDate } = dashboardService.buildDateRange(from, to);

	if (from && to && startDate > endDate) {
		throw new ApiError(400, "'from' date cannot be after 'to' date");
	}

	return { startDate, endDate };
};

export const getOverview = async (req, res, next) => {
	try {
		const { startDate, endDate } = validateDateRange(req.query);
		const overview = await dashboardService.getDashboardOverview(startDate, endDate);
		return res.json(new ApiResponse(200, "Dashboard overview retrieved successfully", overview));
	} catch (err) {
		next(err);
	}
};

export const getKpis = async (req, res, next) => {
	try {
		const { startDate, endDate } = validateDateRange(req.query);
		const kpis = await dashboardService.getDashboardKpis(startDate, endDate);
		return res.json(new ApiResponse(200, "Dashboard KPIs retrieved successfully", {
			range: {
				from: startDate.toISOString(),
				to: endDate.toISOString()
			},
			kpis
		}));
	} catch (err) {
		next(err);
	}
};

export const getAlerts = async (req, res, next) => {
	try {
		const { startDate, endDate } = validateDateRange(req.query);
		const alerts = await dashboardService.getDashboardAlerts(startDate, endDate);
		return res.json(new ApiResponse(200, "Dashboard alerts retrieved successfully", {
			range: {
				from: startDate.toISOString(),
				to: endDate.toISOString()
			},
			alerts
		}));
	} catch (err) {
		next(err);
	}
};