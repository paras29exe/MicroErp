import prisma from "../../../config/db.js";
import { ApiResponse, ApiError } from "../../../utils/response.js";

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value) => typeof value === "string" && value.trim() !== "" && /^[0-9()+\s-]+$/.test(value);

export const addVendor = async (req, res, next) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new ApiError(400, "Vendor name is required");
    }

    if (email && !isValidEmail(email)) {
      throw new ApiError(400, "Invalid email format");
    }

    if (phone !== undefined && phone !== null && !isValidPhone(phone)) {
      throw new ApiError(400, "Invalid phone format");
    }

    if (email) {
      const existing = await prisma.vendor.findUnique({ where: { email } });
      if (existing) throw new ApiError(409, "A vendor with this email already exists");
    }

    const data = await prisma.vendor.create({
      data: {
        name: name.trim(),
        email: email || null,
        phone: phone != null ? phone : null,
        address: address || null,
      },
    });

    return res.status(201).json(new ApiResponse(201, "Vendor added successfully", data));
  } catch (err) {
    next(err);
  }
};

export const getVendors = async (req, res, next) => {
  try {
    const { name, email } = req.query;

    const where = {};
    if (name) where.name = { contains: name, mode: "insensitive" };
    if (email) where.email = email;

    const data = await prisma.vendor.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(new ApiResponse(200, "Vendors retrieved successfully", data));
  } catch (err) {
    next(err);
  }
};

export const getVendor = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) throw new ApiError(400, "Invalid vendor ID");

    const data = await prisma.vendor.findUnique({ where: { id } });
    if (!data) throw new ApiError(404, "Vendor not found");

    return res.status(200).json(new ApiResponse(200, "Vendor retrieved successfully", data));
  } catch (err) {
    next(err);
  }
};

export const editVendor = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) throw new ApiError(400, "Invalid vendor ID");

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Vendor not found");

    const { name, email, phone, address } = req.body;

    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      throw new ApiError(400, "Vendor name cannot be empty");
    }

    if (email !== undefined && email !== null && !isValidEmail(email)) {
      throw new ApiError(400, "Invalid email format");
    }

    if (phone !== undefined && phone !== null && !isValidPhone(phone)) {
      throw new ApiError(400, "Invalid phone format");
    }

    if (email && email !== existing.email) {
      const duplicate = await prisma.vendor.findUnique({ where: { email } });
      if (duplicate) throw new ApiError(409, "A vendor with this email already exists");
    }

    const data = await prisma.vendor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone != null ? phone : null }),
        ...(address !== undefined && { address: address || null }),
      },
    });

    return res.status(200).json(new ApiResponse(200, "Vendor updated successfully", data));
  } catch (err) {
    next(err);
  }
};

export const removeVendor = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) throw new ApiError(400, "Invalid vendor ID");

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Vendor not found");

    const hasPurchases = await prisma.purchase.findFirst({ where: { vendorId: id } });
    if (hasPurchases) throw new ApiError(409, "Cannot delete vendor with existing purchase records");

    await prisma.vendor.delete({ where: { id } });

    return res.status(200).json(new ApiResponse(200, "Vendor deleted successfully"));
  } catch (err) {
    next(err);
  }
};

