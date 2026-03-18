import { Router } from "express";
import { addCustomer, getCustomers, getCustomer, editCustomer, removeCustomer } from "./customer.controller.js";
import { authorizePermission } from "../../../middleware/role.middleware.js";

const router = Router();

// POST   /api/customers/add-customer          - create a new customer
// GET    /api/customers/get-customers         - list all customers (optional ?search=<term>)
// GET    /api/customers/get-customer/:id      - get a single customer with sales history
// PUT    /api/customers/update-customer/:id   - update customer details
// DELETE /api/customers/delete-customer/:id   - delete customer (blocked if sales exist)

router.post(
	"/add-customer",
	authorizePermission("master:create"),
	addCustomer
);
router.get(
	"/get-customers",
	authorizePermission("master:read"),
	getCustomers
);
router.get(
	"/get-customer/:id",
	authorizePermission("master:read"),
	getCustomer
);
router.put(
	"/update-customer/:id",
	authorizePermission("master:update"),
	editCustomer
);
router.delete(
	"/delete-customer/:id",
	authorizePermission("master:delete"),
	removeCustomer
);

export default router;
