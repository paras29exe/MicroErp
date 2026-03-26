import prisma from "../../../config/db.js";
import { ApiResponse, ApiError } from "../../../utils/response.js";

const isValidPhone = (value) => typeof value === "string" && value.trim() !== "" && /^[0-9()+\s-]+$/.test(value);

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
            const exists = await prisma.customer.findUnique({ where: { email } });
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
        const { search, page: pageQuery, pageSize: pageSizeQuery } = req.query;
        const page = pageQuery === undefined ? 1 : Number(pageQuery);
        const pageSize = pageSizeQuery === undefined ? 20 : Number(pageSizeQuery);

        if (!Number.isInteger(page) || page < 1) {
            throw new ApiError(400, "Page must be a positive integer");
        }

        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new ApiError(400, "Page size must be an integer between 1 and 100");
        }

        const searchTerm = typeof search === "string" ? search.trim() : "";

        const where = searchTerm
            ? {
                  OR: [
                      { name: { contains: searchTerm, mode: "insensitive" } },
                      { email: { contains: searchTerm, mode: "insensitive" } },
                      { address: { contains: searchTerm, mode: "insensitive" } },
                      { phone: { contains: searchTerm } },
                  ],
              }
            : undefined;

        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                orderBy: { createdAt: "desc" },
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

        if (phone !== undefined && phone !== null && !isValidPhone(phone)) {
            throw new ApiError(400, "Invalid phone format");
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
