import prisma from "../../../config/db.js";

export const addProduct = async (req, res) => {
    try {
        const { name, price, category, quantity, restockLevel } = req.body;

        if (!name || !price || !category || !quantity || !restockLevel) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const data = await prisma.product.create({
            data: {
                name: name,
                price: price,
                category: category,
                quantity: quantity,
                restockLevel: restockLevel
            }
        });

        if(!data){
            return res.status(400).json({ message: "Failed to add product" });
        }

        return res.status(201)
            .json({
                data, 
                message: "Product added successfully"
            });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}