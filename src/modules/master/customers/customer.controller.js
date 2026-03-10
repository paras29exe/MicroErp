import prisma from "../../../config/db.js";

export const addCustomer = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ error: "Customer name is required" });
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email address" });
        }

        if (email) {
            const exists = await prisma.customer.findUnique({ where: { email } });
            if (exists) return res.status(409).json({ error: "A customer with this email already exists" });
        }

        const data = await prisma.customer.create({
            data: { name: name.trim(), email: email || null, phone: phone || null, address: address || null },
        });

        return res.status(201).json({ data, message: "Customer added successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

export const getCustomers = async (req, res) => {
    try {
        const { search } = req.query;

        const data = await prisma.customer.findMany({
            where: search
                ? {
                      OR: [
                          { name: { contains: search, mode: "insensitive" } },
                          { email: { contains: search, mode: "insensitive" } },
                          { phone: { contains: search, mode: "insensitive" } },
                      ],
                  }
                : undefined,
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({ data, message: "Customers retrieved successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

export const getCustomer = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(400).json({ error: "Invalid customer ID" });

        const data = await prisma.customer.findUnique({
            where: { id },
            include: { sales: { orderBy: { saleDate: "desc" } } },
        });

        if (!data) return res.status(404).json({ error: "Customer not found" });

        return res.status(200).json({ data, message: "Customer retrieved successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

export const editCustomer = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(400).json({ error: "Invalid customer ID" });

        const existing = await prisma.customer.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Customer not found" });

        const { name, email, phone, address } = req.body;

        if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
            return res.status(400).json({ error: "Customer name cannot be empty" });
        }

        if (email !== undefined && email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email address" });
        }

        if (email && email !== existing.email) {
            const duplicate = await prisma.customer.findUnique({ where: { email } });
            if (duplicate) return res.status(409).json({ error: "A customer with this email already exists" });
        }

        const data = await prisma.customer.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(email !== undefined && { email: email || null }),
                ...(phone !== undefined && { phone: phone || null }),
                ...(address !== undefined && { address: address || null }),
            },
        });

        return res.status(200).json({ data, message: "Customer updated successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

export const removeCustomer = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(400).json({ error: "Invalid customer ID" });

        const existing = await prisma.customer.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Customer not found" });

        const hasSales = await prisma.sale.findFirst({ where: { customerId: id } });
        if (hasSales) {
            return res.status(409).json({ error: "Cannot delete customer with existing sales records" });
        }

        await prisma.customer.delete({ where: { id } });

        return res.status(200).json({ message: "Customer deleted successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
