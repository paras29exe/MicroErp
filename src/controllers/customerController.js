export const createCustomer = (req, res) => {
  const { name, phone, address } = req.body;

  res.status(201).json({
    success: true,
    message: "Customer created successfully",
    data: { name, phone, address }
  });
};

export const getCustomers = (req, res) => {
  res.json({
    success: true,
    message: "Customers fetched successfully",
    data: []
  });
};

export const updateCustomer = (req, res) => {
  const { id } = req.params;

  res.json({
    success: true,
    message: `Customer ${id} updated successfully`
  });
};