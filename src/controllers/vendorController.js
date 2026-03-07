export const createVendor = (req, res) => {
  const { name, phone, company } = req.body;

  res.status(201).json({
    success: true,
    message: "Vendor created successfully",
    data: { name, phone, company }
  });
};

export const getVendors = (req, res) => {
  res.json({
    success: true,
    message: "Vendors fetched successfully",
    data: []
  });
};

export const updateVendor = (req, res) => {
  const { id } = req.params;

  res.json({
    success: true,
    message: `Vendor ${id} updated successfully`
  });
};

export const deleteVendor = (req, res) => {
  const { id } = req.params;

  res.json({
    success: true,
    message: `Vendor ${id} deleted successfully`
  });
};