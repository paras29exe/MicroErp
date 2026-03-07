export const createProduct = (req, res) => {
  const { name, price, category } = req.body;

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: { name, price, category }
  });
};

export const getProducts = (req, res) => {
  res.json({
    success: true,
    message: "Products fetched successfully",
    data: []
  });
};

export const updateProduct = (req, res) => {
  const { id } = req.params;

  res.json({
    success: true,
    message: `Product ${id} updated successfully`
  });
};