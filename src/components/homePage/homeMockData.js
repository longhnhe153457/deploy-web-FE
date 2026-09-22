// ─── Daily Report Mock Data ──────────────────────────────────────────────────

export const INITIAL_MOCK_EMPLOYEES = [
  { value: "all", label: "Tất cả nhân viên" },
  { value: "emp1", label: "Nguyễn Văn An (Thu ngân)" },
  { value: "emp2", label: "Trần Thị Bình (Thu ngân)" },
  { value: "emp3", label: "Lê Hoàng Cường (Quản lý)" },
  { value: "emp4", label: "Phạm Minh Đức (Phục vụ)" },
];

export const MOCK_DAILY_REPORT = {
  dateStr: "31/07/2026",
  
  // ─── 4 KPIs ─────────────────────────────────────────────────────────────
  kpis: {
    revenue: {
      value: 28450000,
      formatted: "28.450.000 đ",
      changePct: 12.5,
      isPositive: true,
    },
    expense: {
      value: 11200000,
      formatted: "11.200.000 đ",
      changePct: -4.2,
      isPositive: true, // Reduced expense is good
    },
    profit: {
      value: 17250000,
      formatted: "17.250.000 đ",
      changePct: 24.8,
      isPositive: true,
    },
    orders: {
      value: 142,
      formatted: "142 đơn",
      changePct: 8.4,
      isPositive: true,
    },
  },

  // ─── Hourly Trends (Revenue, Expense, Profit, Order Count) ──────────────
  hourlyTrends: [
    { hour: "06:00", revenue: 450000, expense: 200000, profit: 250000, orders: 3 },
    { hour: "07:00", revenue: 1200000, expense: 500000, profit: 700000, orders: 8 },
    { hour: "08:00", revenue: 1850000, expense: 750000, profit: 1100000, orders: 12 },
    { hour: "09:00", revenue: 1100000, expense: 400000, profit: 700000, orders: 6 },
    { hour: "10:00", revenue: 950000, expense: 350000, profit: 600000, orders: 5 },
    { hour: "11:00", revenue: 3200000, expense: 1200000, profit: 2000000, orders: 18 },
    { hour: "12:00", revenue: 4800000, expense: 1800000, profit: 3000000, orders: 25 },
    { hour: "13:00", revenue: 2600000, expense: 1000000, profit: 1600000, orders: 14 },
    { hour: "14:00", revenue: 1200000, expense: 450000, profit: 750000, orders: 6 },
    { hour: "15:00", revenue: 900000, expense: 350000, profit: 550000, orders: 4 },
    { hour: "16:00", revenue: 1400000, expense: 500000, profit: 900000, orders: 7 },
    { hour: "17:00", revenue: 2100000, expense: 800000, profit: 1300000, orders: 11 },
    { hour: "18:00", revenue: 3900000, expense: 1500000, profit: 2400000, orders: 20 },
    { hour: "19:00", revenue: 2900000, expense: 1100000, profit: 1800000, orders: 15 },
    { hour: "20:00", revenue: 1300000, expense: 500000, profit: 800000, orders: 6 },
    { hour: "21:00", revenue: 600000, expense: 200000, profit: 400000, orders: 3 },
  ],

  // ─── Top 5 Best Selling Items ───────────────────────────────────────────
  topDishes: [
    { name: "Bò Lúc Lắc Sauces", quantity: 38, revenue: 5700000 },
    { name: "Cơm Chiên Hải Sản", quantity: 32, revenue: 3840000 },
    { name: "Lẩu Thái Hải Sản", quantity: 24, revenue: 7200000 },
    { name: "Mì Xào Bò Thượng Hạng", quantity: 21, revenue: 2520000 },
    { name: "Gà Nướng Mật Ong", quantity: 18, revenue: 3240000 },
  ],

  // ─── Sales Details Table Data (15 records) ───────────────────────────────
  salesList: [
    {
      id: "1",
      billCode: "HD-20260731-001",
      time: "08:15",
      tableName: "Bàn 02 (Khu A)",
      cashier: "Nguyễn Văn An",
      itemCount: 4,
      subtotal: 350000,
      surcharge: 0,
      discount: 20000,
      total: 330000,
      paymentMethod: "Tiền mặt",
    },
    {
      id: "2",
      billCode: "HD-20260731-002",
      time: "08:42",
      tableName: "Bàn 05 (Khu B)",
      cashier: "Nguyễn Văn An",
      itemCount: 6,
      subtotal: 620000,
      surcharge: 10000,
      discount: 50000,
      total: 580000,
      paymentMethod: "Chuyển khoản / QR",
    },
    {
      id: "3",
      billCode: "HD-20260731-003",
      time: "11:20",
      tableName: "Bàn VIP 01",
      cashier: "Trần Thị Bình",
      itemCount: 12,
      subtotal: 2150000,
      surcharge: 50000,
      discount: 100000,
      total: 2100000,
      paymentMethod: "Thẻ Visa/Master",
    },
    {
      id: "4",
      billCode: "HD-20260731-004",
      time: "11:55",
      tableName: "Bàn 08 (Khu A)",
      cashier: "Trần Thị Bình",
      itemCount: 5,
      subtotal: 480000,
      surcharge: 0,
      discount: 0,
      total: 480000,
      paymentMethod: "Chuyển khoản / QR",
    },
    {
      id: "5",
      billCode: "HD-20260731-005",
      time: "12:10",
      tableName: "Bàn 03 (Khu B)",
      cashier: "Nguyễn Văn An",
      itemCount: 8,
      subtotal: 890000,
      surcharge: 0,
      discount: 45000,
      total: 845000,
      paymentMethod: "Tiền mặt",
    },
    {
      id: "6",
      billCode: "HD-20260731-006",
      time: "12:35",
      tableName: "Bàn 12 (Khu C)",
      cashier: "Trần Thị Bình",
      itemCount: 7,
      subtotal: 750000,
      surcharge: 0,
      discount: 0,
      total: 750000,
      paymentMethod: "Chuyển khoản / QR",
    },
    {
      id: "7",
      billCode: "HD-20260731-007",
      time: "13:05",
      tableName: "Bàn 01 (Khu A)",
      cashier: "Nguyễn Văn An",
      itemCount: 3,
      subtotal: 290000,
      surcharge: 0,
      discount: 10000,
      total: 280000,
      paymentMethod: "Tiền mặt",
    },
    {
      id: "8",
      billCode: "HD-20260731-008",
      time: "18:20",
      tableName: "Bàn VIP 02",
      cashier: "Trần Thị Bình",
      itemCount: 15,
      subtotal: 3400000,
      surcharge: 100000,
      discount: 200000,
      total: 3300000,
      paymentMethod: "Thẻ Visa/Master",
    },
    {
      id: "9",
      billCode: "HD-20260731-009",
      time: "19:15",
      tableName: "Bàn 07 (Khu B)",
      cashier: "Nguyễn Văn An",
      itemCount: 9,
      subtotal: 1120000,
      surcharge: 0,
      discount: 50000,
      total: 1070000,
      paymentMethod: "Chuyển khoản / QR",
    },
    {
      id: "10",
      billCode: "HD-20260731-010",
      time: "20:00",
      tableName: "Bàn 04 (Khu A)",
      cashier: "Trần Thị Bình",
      itemCount: 4,
      subtotal: 420000,
      surcharge: 0,
      discount: 20000,
      total: 400000,
      paymentMethod: "Tiền mặt",
    },
    {
      id: "11",
      billCode: "HD-20260731-011",
      time: "20:30",
      tableName: "Bàn 09 (Khu C)",
      cashier: "Nguyễn Văn An",
      itemCount: 5,
      subtotal: 540000,
      surcharge: 0,
      discount: 30000,
      total: 510000,
      paymentMethod: "Chuyển khoản / QR",
    },
    {
      id: "12",
      billCode: "HD-20260731-012",
      time: "20:45",
      tableName: "Bàn 11 (Khu B)",
      cashier: "Trần Thị Bình",
      itemCount: 6,
      subtotal: 680000,
      surcharge: 0,
      discount: 0,
      total: 680000,
      paymentMethod: "Tiền mặt",
    },
    {
      id: "13",
      billCode: "HD-20260731-013",
      time: "21:10",
      tableName: "Bàn 06 (Khu A)",
      cashier: "Nguyễn Văn An",
      itemCount: 3,
      subtotal: 310000,
      surcharge: 0,
      discount: 10000,
      total: 300000,
      paymentMethod: "Thẻ Visa/Master",
    },
    {
      id: "14",
      billCode: "HD-20260731-014",
      time: "21:30",
      tableName: "Bàn 10 (Khu C)",
      cashier: "Trần Thị Bình",
      itemCount: 7,
      subtotal: 820000,
      surcharge: 0,
      discount: 40000,
      total: 780000,
      paymentMethod: "Chuyển khoản / QR",
    },
    {
      id: "15",
      billCode: "HD-20260731-015",
      time: "21:50",
      tableName: "Bàn VIP 03",
      cashier: "Nguyễn Văn An",
      itemCount: 11,
      subtotal: 1950000,
      surcharge: 50000,
      discount: 100000,
      total: 1900000,
      paymentMethod: "Chuyển khoản / QR",
    },
  ],

  // ─── CashFlow Details Table Data (14 records) ───────────────────────────
  cashFlowList: [
    {
      id: "1",
      code: "TC-20260731-001",
      type: "Thu",
      person: "Khách lẻ hàng ngày",
      note: "Thu tiền doanh số ca sáng",
      amount: 12500000,
      docCode: "CT-TN-01",
      time: "14:00",
    },
    {
      id: "2",
      code: "TC-20260731-002",
      type: "Chi",
      person: "Công ty Thực Phẩm Sạch Hải Nam",
      note: "Chi tiền nhập hải sản tươi sống trong ngày",
      amount: 4800000,
      docCode: "CT-NK-88",
      time: "07:30",
    },
    {
      id: "3",
      code: "TC-20260731-003",
      type: "Chi",
      person: "Nông trại Đà Lạt Green",
      note: "Chi tiền nhập rau củ quả tươi",
      amount: 1500000,
      docCode: "CT-NK-89",
      time: "08:00",
    },
    {
      id: "4",
      code: "TC-20260731-004",
      type: "Thu",
      person: "Công ty Công Nghệ ABC",
      note: "Thu tiền đặt cọc tiệc sinh nhật tối",
      amount: 2000000,
      docCode: "CT-DC-05",
      time: "10:30",
    },
    {
      id: "5",
      code: "TC-20260731-005",
      type: "Chi",
      person: "Điện lực Thành phố",
      note: "Thanh toán hóa đơn điện máy lạnh",
      amount: 3200000,
      docCode: "CT-EVN-07",
      time: "15:45",
    },
    {
      id: "6",
      code: "TC-20260731-006",
      type: "Thu",
      person: "Khách lẻ hàng ngày",
      note: "Thu tiền doanh số ca tối",
      amount: 13950000,
      docCode: "CT-TN-02",
      time: "21:30",
    },
    {
      id: "7",
      code: "TC-20260731-007",
      type: "Chi",
      person: "Cửa hàng Gia vị Phú Cường",
      note: "Chi bổ sung gia vị bếp ăn",
      amount: 1700000,
      docCode: "CT-NK-90",
      time: "16:20",
    },
    {
      id: "8",
      code: "TC-20260731-008",
      type: "Thu",
      person: "Anh Nguyễn Hoàng Nam",
      note: "Thu tiền cọc tiệc gia đình thứ 7",
      amount: 1500000,
      docCode: "CT-DC-06",
      time: "17:10",
    },
    {
      id: "9",
      code: "TC-20260731-009",
      type: "Chi",
      person: "Cửa hàng Khăn lạnh & Giấy lau Mỹ Lan",
      note: "Chi vật tư tiêu hao nhà hàng",
      amount: 650000,
      docCode: "CT-VT-12",
      time: "09:20",
    },
    {
      id: "10",
      code: "TC-20260731-010",
      type: "Thu",
      person: "Đại lý Bia Nước Ngọt Tân Phát",
      note: "Thu tiền chiết khấu tháng 7",
      amount: 1800000,
      docCode: "CT-CK-03",
      time: "11:45",
    },
    {
      id: "11",
      code: "TC-20260731-011",
      type: "Chi",
      person: "Đơn vị Bảo dưỡng điều hòa 247",
      note: "Chi phí sửa chữa hệ thống làm mát bếp",
      amount: 950000,
      docCode: "CT-SC-04",
      time: "14:15",
    },
    {
      id: "12",
      code: "TC-20260731-012",
      type: "Chi",
      person: "Gas Công Nghiệp Bình Minh",
      note: "Chi thay bình gas công nghiệp lớn",
      amount: 2400000,
      docCode: "CT-GAS-09",
      time: "15:00",
    },
    {
      id: "13",
      code: "TC-20260731-013",
      type: "Thu",
      person: "Công ty Sự Kiện EventPlus",
      note: "Thu tiền quyết toán hội nghị khách hàng",
      amount: 8500000,
      docCode: "CT-QT-11",
      time: "18:40",
    },
    {
      id: "14",
      code: "TC-20260731-014",
      type: "Chi",
      person: "Tập đoàn Nước sạch Đồng Nai",
      note: "Thanh toán hóa đơn nước sinh hoạt",
      amount: 1100000,
      docCode: "CT-WA-02",
      time: "19:50",
    },
  ],

  // ─── Inventory Details Table Data (14 items) ────────────────────────────
  inventoryList: [
    {
      id: "1",
      itemCode: "SP-001",
      itemName: "Bò Lúc Lắc Sauces",
      qtySold: 38,
      unitPrice: 150000,
      revenue: 5700000,
      sharePct: 20.0,
    },
    {
      id: "2",
      itemCode: "SP-002",
      itemName: "Cơm Chiên Hải Sản",
      qtySold: 32,
      unitPrice: 120000,
      revenue: 3840000,
      sharePct: 13.5,
    },
    {
      id: "3",
      itemCode: "SP-003",
      itemName: "Lẩu Thái Hải Sản",
      qtySold: 24,
      unitPrice: 300000,
      revenue: 7200000,
      sharePct: 25.3,
    },
    {
      id: "4",
      itemCode: "SP-004",
      itemName: "Mì Xào Bò Thượng Hạng",
      qtySold: 21,
      unitPrice: 120000,
      revenue: 2520000,
      sharePct: 8.9,
    },
    {
      id: "5",
      itemCode: "SP-005",
      itemName: "Gà Nướng Mật Ong",
      qtySold: 18,
      unitPrice: 180000,
      revenue: 3240000,
      sharePct: 11.4,
    },
    {
      id: "6",
      itemCode: "SP-006",
      itemName: "Salad Dầu Giấm Trộn Trứng",
      qtySold: 26,
      unitPrice: 65000,
      revenue: 1690000,
      sharePct: 5.9,
    },
    {
      id: "7",
      itemCode: "SP-007",
      itemName: "Nước Cam Ép Tươi",
      qtySold: 45,
      unitPrice: 40000,
      revenue: 1800000,
      sharePct: 6.3,
    },
    {
      id: "8",
      itemCode: "SP-008",
      itemName: "Trà Đào Cam Sả Hạt Chia",
      qtySold: 52,
      unitPrice: 47000,
      revenue: 2464000,
      sharePct: 8.7,
    },
    {
      id: "9",
      itemCode: "SP-009",
      itemName: "Khoai Tây Chiên Bơ Tỏi",
      qtySold: 30,
      unitPrice: 55000,
      revenue: 1650000,
      sharePct: 5.8,
    },
    {
      id: "10",
      itemCode: "SP-010",
      itemName: "Rau Muống Xào Tỏi Bơ",
      qtySold: 28,
      unitPrice: 45000,
      revenue: 1260000,
      sharePct: 4.4,
    },
    {
      id: "11",
      itemCode: "SP-011",
      itemName: "Mực Chấy Tỏi Nước Mắm",
      qtySold: 16,
      unitPrice: 165000,
      revenue: 2640000,
      sharePct: 9.3,
    },
    {
      id: "12",
      itemCode: "SP-012",
      itemName: "Sườn Nướng BBQ Sốt Cay",
      qtySold: 14,
      unitPrice: 210000,
      revenue: 2940000,
      sharePct: 10.3,
    },
    {
      id: "13",
      itemCode: "SP-013",
      itemName: "Trà Sữa Oolong Kem Trứng",
      qtySold: 40,
      unitPrice: 42000,
      revenue: 1680000,
      sharePct: 5.9,
    },
    {
      id: "14",
      itemCode: "SP-014",
      itemName: "Chè Hạt Sen Long Nhãn",
      qtySold: 22,
      unitPrice: 35000,
      revenue: 770000,
      sharePct: 2.7,
    },
  ],
};

/**
 * Hàm lọc dữ liệu báo cáo động theo Ngày chọn và Nhân viên chọn
 */
export const generateFilteredReportData = (dateStr, employeeValue = "all") => {
  const baseData = MOCK_DAILY_REPORT;

  // 1. Lọc theo nhân viên (Employee Filter)
  let empNameFilter = null;
  if (employeeValue === "emp1") empNameFilter = "Nguyễn Văn An";
  if (employeeValue === "emp2") empNameFilter = "Trần Thị Bình";
  if (employeeValue === "emp3") empNameFilter = "Lê Hoàng Cường";
  if (employeeValue === "emp4") empNameFilter = "Phạm Minh Đức";

  let filteredSales = baseData.salesList;
  if (empNameFilter) {
    filteredSales = baseData.salesList.filter(
      (item) => item.cashier.toLowerCase() === empNameFilter.toLowerCase()
    );
  }

  // 2. Tạo hệ số phân hóa dữ liệu dựa trên Ngày báo cáo
  let dateSeed = 1;
  if (dateStr) {
    let charSum = 0;
    for (let i = 0; i < dateStr.length; i++) {
      charSum += dateStr.charCodeAt(i);
    }
    dateSeed = 0.75 + (charSum % 6) * 0.1; // Hệ số từ 0.75 đến 1.25
  }

  // Điều chỉnh danh sách bán hàng theo Ngày nếu chọn ngày khác
  if (dateSeed !== 1 && !empNameFilter) {
    filteredSales = baseData.salesList.map((item) => {
      const subtotal = Math.round((item.subtotal * dateSeed) / 10000) * 10000;
      const discount = Math.round((item.discount * dateSeed) / 10000) * 10000;
      const total = subtotal + item.surcharge - discount;
      return {
        ...item,
        subtotal,
        discount,
        total,
      };
    });
  }

  // Tính toán lại Tổng doanh thu & KPIs
  let totalRevenue = 0;
  let totalOrders = filteredSales.length;
  filteredSales.forEach((s) => {
    totalRevenue += s.total;
  });

  const totalExpense = Math.round((totalRevenue * 0.38) / 10000) * 10000;
  const totalProfit = totalRevenue - totalExpense;

  const formatVND = (val) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const kpis = {
    revenue: {
      value: totalRevenue,
      formatted: formatVND(totalRevenue),
      changePct: Number(((dateSeed * 12.5) % 25).toFixed(1)),
      isPositive: true,
    },
    expense: {
      value: totalExpense,
      formatted: formatVND(totalExpense),
      changePct: Number((((1 / dateSeed) * -4.2) % 15).toFixed(1)),
      isPositive: true,
    },
    profit: {
      value: totalProfit,
      formatted: formatVND(totalProfit),
      changePct: Number(((dateSeed * 18.2) % 30).toFixed(1)),
      isPositive: true,
    },
    orders: {
      value: totalOrders,
      formatted: `${totalOrders} đơn`,
      changePct: Number(((dateSeed * 8.4) % 15).toFixed(1)),
      isPositive: true,
    },
  };

  // Điều chỉnh Báo cáo Thu chi theo Ngày & Nhân viên
  const filteredCashFlow = baseData.cashFlowList.map((item) => {
    const amount = Math.round((item.amount * dateSeed) / 10000) * 10000;
    return { ...item, amount };
  });

  // Điều chỉnh Báo cáo Hàng hóa theo Ngày & Nhân viên
  const filteredInventory = baseData.inventoryList.map((item) => {
    const qtySold = Math.max(1, Math.round(item.qtySold * dateSeed * (empNameFilter ? 0.6 : 1)));
    const revenue = qtySold * item.unitPrice;
    return { ...item, qtySold, revenue };
  });

  // Tính lại tỷ trọng % cho hàng hóa
  const totalInvRev = filteredInventory.reduce((acc, curr) => acc + curr.revenue, 0);
  filteredInventory.forEach((item) => {
    item.sharePct = Number(((item.revenue / (totalInvRev || 1)) * 100).toFixed(1));
  });

  return {
    ...baseData,
    dateStr: dateStr || baseData.dateStr,
    kpis,
    salesList: filteredSales,
    cashFlowList: filteredCashFlow,
    inventoryList: filteredInventory,
  };
};
