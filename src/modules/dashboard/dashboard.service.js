import prisma from "../../config/db.js";

/**
 
  @param {string} from 
  @param {string} to 
  @returns {object} 
 */
export const buildDateRange = (from, to) => {
	let startDate, endDate;

	if (to) {
		endDate = new Date(to);
		endDate.setHours(23, 59, 59, 999);
	} else {
		endDate = new Date();
		endDate.setHours(23, 59, 59, 999); 
	}

	if (from) {
		startDate = new Date(from);
		startDate.setHours(0, 0, 0, 0);
	} else if (to) {
		startDate = new Date(0);
	} else {

		startDate = new Date();
		startDate.setDate(startDate.getDate() - 30);
		startDate.setHours(0, 0, 0, 0);
	}

	return { startDate, endDate };
};

export const getDashboardKpis = async (startDate, endDate) => {
	const [
		salesCount,
		salesAgg,
		purchasesCount,
		purchasesAmount,
		pendingPurchasesCount,
		pendingPurchasesAmount,
		productionEntriesCount,
		distinctProducedProducts,
		productionQuantity,
		totalTrackedProducts,
		lowStockProducts,
		outOfStockProducts,
		activeUsers,
		inactiveUsers
	] = await Promise.all([
		prisma.sale.count({ where: { saleDate: { gte: startDate, lte: endDate } } }),
		prisma.sale.aggregate({
			_sum: { totalAmount: true, grossProfit: true },
			where: { saleDate: { gte: startDate, lte: endDate } }
		}),
		prisma.purchase.count({ where: { purchaseDate: { gte: startDate, lte: endDate } } }),
		prisma.purchase.aggregate({
			_sum: { totalAmount: true },
			where: { purchaseDate: { gte: startDate, lte: endDate } }
		}),
		prisma.purchase.count({
			where: {
				paymentStatus: "pending",
				purchaseDate: { gte: startDate, lte: endDate }
			}
		}),
		prisma.purchase.aggregate({
			_sum: { totalAmount: true },
			where: {
				paymentStatus: "pending",
				purchaseDate: { gte: startDate, lte: endDate }
			}
		}),
		prisma.production.count({ where: { productionDate: { gte: startDate, lte: endDate } } }),
		prisma.production.groupBy({
			by: ['productId'],
			where: { productionDate: { gte: startDate, lte: endDate } }
		}),
		prisma.production.aggregate({
			_sum: { quantity: true },
			where: { productionDate: { gte: startDate, lte: endDate } }
		}),
		prisma.inventory.count(),
		prisma.inventory.count({
			where: {
				stockQuantity: {
					gt: 0,
					lte: prisma.inventory.fields.reorderLevel,
				}
			}
		}),
		prisma.inventory.count({ where: { stockQuantity: { lte: 0 } } }),
		prisma.user.count({ where: { isDeleted: false, isActive: true } }),
		prisma.user.count({ where: { isDeleted: false, isActive: false } })
	]);

	return {
		definitions: {
			sales: {
				count: 'Number of sales orders in selected period',
				totalAmount: 'Total billed amount from sales orders',
				grossProfit: 'Total gross profit from sales orders'
			},
			purchases: {
				count: 'Number of purchase orders in selected period',
				totalAmount: 'Total purchase amount in selected period',
				pendingCount: 'Number of purchase orders with pending payment',
				pendingAmount: 'Total pending purchase payment amount'
			},
			production: {
				distinctProductsCount: 'Number of distinct products produced',
				entriesCount: 'Number of production entries logged',
				totalQuantity: 'Total units produced across all entries'
			},
			inventory: {
				totalProducts: 'Number of products tracked in inventory',
				lowStockProducts: 'Products below reorder threshold but above zero stock',
				outOfStockProducts: 'Products with zero or below stock'
			},
			users: {
				active: 'Active users available in the system',
				inactive: 'Inactive users in the system'
			}
		},
		sales: {
			count: salesCount,
			totalAmount: salesAgg._sum.totalAmount || 0,
			grossProfit: salesAgg._sum.grossProfit || 0
		},
		purchases: {
			count: purchasesCount,
			totalAmount: purchasesAmount._sum.totalAmount || 0,
			pendingCount: pendingPurchasesCount,
			pendingAmount: pendingPurchasesAmount._sum.totalAmount || 0
		},
		production: {
			distinctProductsCount: distinctProducedProducts.length,
			entriesCount: productionEntriesCount,
			totalQuantity: productionQuantity._sum.quantity || 0
		},
		inventory: {
			totalProducts: totalTrackedProducts,
			lowStockProducts,
			outOfStockProducts
		},
		users: {
			active: activeUsers,
			inactive: inactiveUsers
		}
	};
};


export const getDashboardTrends = async (startDate, endDate) => {
	const [sales, purchases, productions] = await Promise.all([
		prisma.sale.findMany({
			where: { saleDate: { gte: startDate, lte: endDate } },
			select: { saleDate: true, totalAmount: true }
		}),
		prisma.purchase.findMany({
			where: { purchaseDate: { gte: startDate, lte: endDate } },
			select: { purchaseDate: true, totalAmount: true }
		}),
		prisma.production.findMany({
			where: { productionDate: { gte: startDate, lte: endDate } },
			select: { productionDate: true, quantity: true }
		})
	]);


	const salesTrendMap = {};
	sales.forEach(s => {
		const dateStr = s.saleDate.toISOString().split('T')[0];
		if (!salesTrendMap[dateStr]) {
			salesTrendMap[dateStr] = { date: dateStr, count: 0, amount: 0 };
		}
		salesTrendMap[dateStr].count++;
		salesTrendMap[dateStr].amount += s.totalAmount;
	});


	const purchaseTrendMap = {};
	purchases.forEach(p => {
		const dateStr = p.purchaseDate.toISOString().split('T')[0];
		if (!purchaseTrendMap[dateStr]) {
			purchaseTrendMap[dateStr] = { date: dateStr, count: 0, amount: 0 };
		}
		purchaseTrendMap[dateStr].count++;
		purchaseTrendMap[dateStr].amount += p.totalAmount;
	});

	const productionTrendMap = {};
	productions.forEach(p => {
		const dateStr = p.productionDate.toISOString().split('T')[0];
		if (!productionTrendMap[dateStr]) {
			productionTrendMap[dateStr] = { date: dateStr, count: 0, quantity: 0 };
		}
		productionTrendMap[dateStr].count++;
		productionTrendMap[dateStr].quantity += p.quantity;
	});

	return {
		sales: Object.values(salesTrendMap).sort((a, b) => a.date.localeCompare(b.date)),
		purchases: Object.values(purchaseTrendMap).sort((a, b) => a.date.localeCompare(b.date)),
		production: Object.values(productionTrendMap).sort((a, b) => a.date.localeCompare(b.date))
	};
};


export const getDashboardAlerts = async (startDate, endDate) => {
	const [inventoryData, recentSales, recentPurchases, recentProductions] = await Promise.all([
		prisma.inventory.findMany({
			where: {
				OR: [
					{ stockQuantity: { lte: 0 } },
					{ stockQuantity: { lte: prisma.inventory.fields.reorderLevel } }
				]
			},
			select: {
				productId: true,
				stockQuantity: true,
				reorderLevel: true,
				product: {
					select: {
						name: true
					}
				}
			}
		}),
		prisma.sale.findMany({
			where: { saleDate: { gte: startDate, lte: endDate } },
			orderBy: { saleDate: 'desc' },
			take: 10,
			select: {
				id: true,
				saleDate: true,
				totalAmount: true,
				grossProfit: true,
				customer: { select: { name: true } }
			}
		}),
		prisma.purchase.findMany({
			where: { purchaseDate: { gte: startDate, lte: endDate } },
			orderBy: { purchaseDate: 'desc' },
			take: 10,
			select: {
				id: true,
				purchaseDate: true,
				totalAmount: true,
				paymentStatus: true,
				vendor: { select: { name: true } }
			}
		}),
		prisma.production.findMany({
			where: { productionDate: { gte: startDate, lte: endDate } },
			orderBy: { productionDate: 'desc' },
			take: 10,
			select: {
				id: true,
				productionDate: true,
				quantity: true,
				totalCost: true,
				product: { select: { name: true } }
			}
		})
	]);

	const lowStockAlerts = inventoryData
		.filter(i => i.stockQuantity <= i.reorderLevel)
		.map(i => ({
			productId: i.productId,
			productName: i.product.name,
			stockQuantity: i.stockQuantity,
			reorderLevel: i.reorderLevel,
			shortBy: Math.max(0, i.reorderLevel - i.stockQuantity)
		}));

	const outOfStockProducts = lowStockAlerts.filter((item) => item.stockQuantity <= 0).length;
	const mostCritical = lowStockAlerts.reduce((current, item) => {
		if (!current || item.shortBy > current.shortBy) {
			return item;
		}

		return current;
	}, null);

	return {
		summary: {
			lowStockProducts: lowStockAlerts.length,
			outOfStockProducts,
			criticalProduct: mostCritical,
		},
		lowStock: lowStockAlerts,
		recentSales,
		recentPurchases,
		recentProductions
	};
};

export const getDashboardOverview = async (startDate, endDate) => {
	const [kpis, trends, alerts] = await Promise.all([
		getDashboardKpis(startDate, endDate),
		getDashboardTrends(startDate, endDate),
		getDashboardAlerts(startDate, endDate)
	]);

	return {
		range: {
			from: startDate.toISOString(),
			to: endDate.toISOString()
		},
		kpis,
		trends,
		alerts
	};
};