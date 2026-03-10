import prisma from "../../../config/db.js";

export const addProduct = async (req, res) => {
    try {
        const { name, price, description, category } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({ error: "name, price and category are required" });
        }
        
        if (price <= 0) {
            return res.status(400).json({ error: "Price must be a positive value" });
        }

        const data = await prisma.product.create({
            data: { name, description, category, price },
        });

        return res.status(201).json({ data, message: "Product added successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

export const getProducts = async (req, res) => {
    try {
        const { category } = req.query;
        const data = await prisma.product.findMany({
            where: category ? { category } : undefined,
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json({ data, message: "Products retrieved successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

export const getProduct = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = await prisma.product.findUnique({ where: { id } });
        if (!data) return res.status(404).json({ error: "Product not found" });
        return res.status(200).json({ data, message: "Product retrieved successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

export const editProduct = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, description, category, price } = req.body;

        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Product not found" });

        if (price !== undefined && price <= 0) {
            return res.status(400).json({ error: "Price must be a positive value" });
        }

        const data = await prisma.product.update({
            where: { id },
            data: { name, description, category, price },
        });
        return res.status(200).json({ data, message: "Product updated successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

export const removeProduct = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const existing = await prisma.product.findUnique({ where: { id } });

        if (!existing) return res.status(404).json({ error: "Product not found" });

        await prisma.product.delete({ where: { id } });

        return res.status(200).json({ message: "Product deleted successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};