import prisma from "../../../config/db.js";

const isValidEmail = (value) => {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const addVendor = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (email) {
      const existing = await prisma.vendor.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: "Email already in use" });
      }
    }

    const data = await prisma.vendor.create({
      data: { name, email, phone, address },
    });

    return res.status(201).json({ data, message: "Vendor added successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getVendors = async (req, res) => {
  try {
    const { name, email } = req.query;

    const where = {};
    if (name) where.name = { contains: name, mode: "insensitive" };
    if (email) where.email = email;

    const data = await prisma.vendor.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ data, message: "Vendors retrieved successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getVendor = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid vendor id" });
    }

    const data = await prisma.vendor.findUnique({ where: { id } });
    if (!data) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    return res.status(200).json({ data, message: "Vendor retrieved successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const editVendor = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, phone, address } = req.body;

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid vendor id" });
    }

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (email && email !== existing.email) {
      const emailInUse = await prisma.vendor.findUnique({ where: { email } });
      if (emailInUse) {
        return res.status(409).json({ error: "Email already in use" });
      }
    }

    const data = await prisma.vendor.update({
      where: { id },
      data: { name, email, phone, address },
    });

    return res.status(200).json({ data, message: "Vendor updated successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const removeVendor = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid vendor id" });
    }

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    await prisma.vendor.delete({ where: { id } });

    return res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
