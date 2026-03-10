import prisma from "../../../config/db.js";
import { ApiResponse, ApiError } from "../../../utils/response.js";

export const addCustomer = async (req, res, next) => {
    try {
        const { name, email, phone, address } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            throw new ApiError(400, "Customer name is required");
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "Invalid email address");
        }

        if (phone !== undefined && phone !== null && (!Number.isInteger(Number(phone)) || Number(phone) <= 0)) {
            throw new ApiError(400, "Phone must be a positive integer");
        }

        if (email) {
            const exists = await prisma.customer.findUnique({ where: { email } });
            if (exists) throw new ApiError(409, "A customer with this email already exists");
        }

        const data = await prisma.customer.create({
            data: {
                name: name.trim(),
                email: email || null,
                phone: phone != null ? parseInt(phone) : null,
                address: address || null,
            },
        });

        return res.status(201).json(new ApiResponse(201, "Customer added successfully", data));
    } catch (err) {
        next(err);
    }
};

export const getCustomers = async (req, res, next) => {
    try {
        const { search } = req.query;

        const data = await prisma.customer.findMany({
            where: search
                ? {
                      OR: [
                          { name: { contains: search, mode: "insensitive" } },
                          { email: { contains: search, mode: "insensitive" } },
                          { address: { contains: search, mode: "insensitive" } },
                      ],
                  }
                : undefined,
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json(new ApiResponse(200, "Customers retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const getCustomer = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid customer ID");

        const data = await prisma.customer.findUnique({
            where: { id },
            include: { sales: { orderBy: { saleDate: "desc" } } },
        });

        if (!data) throw new ApiError(404, "Customer not found");

        return res.status(200).json(new ApiResponse(200, "Customer retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const editCustomer = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid customer ID");

        const existing = await prisma.customer.findUnique({ where: { id } });
        if (!existing) throw new ApiError(404, "Customer not found");

        const { name, email, phone, address } = req.body;

        if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
            throw new ApiError(400, "Customer name cannot be empty");
        }

        if (email !== undefined && email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "Invalid email address");
        }

        if (phone !== undefined && phone !== null && (!Number.isInteger(Number(phone)) || Number(phone) <= 0)) {
            throw new ApiError(400, "Phone must be a positive integer");
        }

        if (email && email !== existing.email) {
            const duplicate = await prisma.customer.findUnique({ where: { email } });
            if (duplicate) throw new ApiError(409, "A customer with this email already exists");
        }

        const data = await prisma.customer.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(email !== undefined && { email: email || null }),
                ...(phone !== undefined && { phone: phone != null ? parseInt(phone) : null }),
                ...(address !== undefined && { address: address || null }),
            },
        });

        return res.status(200).json(new ApiResponse(200, "Customer updated successfully", data));
    } catch (err) {
        next(err);
    }
};

export const removeCustomer = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid customer ID");

        const existing = await prisma.customer.findUnique({ where: { id } });
        if (!existing) throw new ApiError(404, "Customer not found");

        const hasSales = await prisma.sale.findFirst({ where: { customerId: id } });
        if (hasSales) throw new ApiError(409, "Cannot delete customer with existing sales records");

        await prisma.customer.delete({ where: { id } });

        return res.status(200).json(new ApiResponse(200, "Customer deleted successfully"));
    } catch (err) {
        next(err);
    }
};
