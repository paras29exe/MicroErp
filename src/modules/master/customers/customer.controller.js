import prisma from "../../../config/db.js";
import { ApiResponse, ApiError } from "../../../utils/response.js";

const isValidPhone = (value) => typeof value === "string" && value.trim() !== "" && /^[0-9()+\s-]+$/.test(value);
const VALID_STATUS = ["active", "archived", "all"];

export const addCustomer = async (req, res, next) => {
    try {
        const { name, email, phone, address } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            throw new ApiError(400, "Customer name is required");
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "Invalid email address");
        }

        if (phone !== undefined && phone !== null && !isValidPhone(phone)) {
            throw new ApiError(400, "Invalid phone format");
        }

        if (email) {
            const exists = await prisma.customer.findFirst({ where: { email, isDeleted: false } });
            if (exists) throw new ApiError(409, "A customer with this email already exists");
        }

        const data = await prisma.customer.create({
            data: {
                name: name.trim(),
                email: email || null,
                phone: phone != null ? phone : null,
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
        const { search, status = "active", page: pageQuery, pageSize: pageSizeQuery } = req.query;
        const page = pageQuery === undefined ? 1 : Number(pageQuery);
        const pageSize = pageSizeQuery === undefined ? 20 : Number(pageSizeQuery);

        if (!VALID_STATUS.includes(status)) {
            throw new ApiError(400, `Status must be one of: ${VALID_STATUS.join(", ")}`);
        }

        if (!Number.isInteger(page) || page < 1) {
            throw new ApiError(400, "Page must be a positive integer");
        }

        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new ApiError(400, "Page size must be an integer between 1 and 100");
        }

        const searchTerm = typeof search === "string" ? search.trim() : "";

        const where = {
            ...(searchTerm
                ? {
                      OR: [
                          { name: { contains: searchTerm, mode: "insensitive" } },
                          { email: { contains: searchTerm, mode: "insensitive" } },
                          { address: { contains: searchTerm, mode: "insensitive" } },
                          { phone: { contains: searchTerm } },
                      ],
                  }
                : {}),
                        ...(status === "active" ? { isDeleted: false } : {}),
                        ...(status === "archived" ? { isDeleted: true } : {}),
        };

        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                orderBy: [{ name: "asc" }, { id: "desc" }],
                skip,
                take: pageSize,
            }),
            prisma.customer.count({ where }),
        ]);

        const data = {
            items,
            meta: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };

        return res.status(200).json(new ApiResponse(200, "Customers retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const getCustomer = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid customer ID");

        const data = await prisma.customer.findFirst({
            where: { id, isDeleted: false },
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

        const existing = await prisma.customer.findFirst({ where: { id, isDeleted: false } });
        if (!existing) throw new ApiError(404, "Customer not found");

        const { name, email, phone, address } = req.body;

        if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
            throw new ApiError(400, "Customer name cannot be empty");
        }

        if (email !== undefined && email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "Invalid email address");
        }

        if (phone !== undefined && phone !== null && !isValidPhone(phone)) {
            throw new ApiError(400, "Invalid phone format");
        }

        if (email && email !== existing.email) {
            const duplicate = await prisma.customer.findFirst({ where: { email, isDeleted: false } });
            if (duplicate) throw new ApiError(409, "A customer with this email already exists");
        }

        const data = await prisma.customer.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(email !== undefined && { email: email || null }),
                ...(phone !== undefined && { phone: phone != null ? phone : null }),
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

        const existing = await prisma.customer.findFirst({ where: { id, isDeleted: false } });
        if (!existing) throw new ApiError(404, "Customer not found");

        await prisma.customer.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                email: null,
            },
        });

        return res.status(200).json(new ApiResponse(200, "Customer archived successfully"));
    } catch (err) {
        next(err);
    }
};

export const restoreCustomer = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid customer ID");

        const existing = await prisma.customer.findFirst({ where: { id, isDeleted: true } });
        if (!existing) throw new ApiError(404, "Archived customer not found");

        await prisma.customer.update({
            where: { id },
            data: {
                isDeleted: false,
                deletedAt: null,
            },
        });

        return res.status(200).json(new ApiResponse(200, "Customer restored successfully"));
    } catch (err) {
        next(err);
    }
};
