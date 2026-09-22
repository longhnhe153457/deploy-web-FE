import dayjs from "dayjs";

// ============================================================================
// 1. STATS OVERVIEW MOCK DATA
// ============================================================================
export const MOCK_INVENTORY_STATS = {
  totalItems: 148,
  totalValue: 345800000, // 345.8 triệu VND
  lowStockCount: 5,
  outOfStockCount: 3,
  needInspectionCount: 8,
  expiringSoonCount: 6,
  varianceThresholdPercent: 10,
};

// ============================================================================
// 2. INVENTORY STATUS BREAKDOWN DATA FOR CHART & SUMMARY
// ============================================================================
export const MOCK_STATUS_CHART_DATA = [
  {
    category: "Kho tổng",
    normal: 126,
    lowStock: 5,
    outOfStock: 3,
    needCheck: 8,
    expiringSoon: 6,
  },
];

export const MOCK_STATUS_SUMMARY = [
  { key: "normal", label: "Bình thường", count: 126, color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
  { key: "lowStock", label: "Sắp hết", count: 5, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { key: "outOfStock", label: "Hết hàng", count: 3, color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  { key: "needCheck", label: "Cần kiểm tra", count: 8, color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd" },
  { key: "expiringSoon", label: "Sắp hết hạn", count: 6, color: "#f97316", bg: "#fff7ed", border: "#ffedd5" },
];

// ============================================================================
// 3. CONSUMPTION REPORT DATA (BÁO CÁO TIÊU THỤ & SAI SỐ)
// ============================================================================
// Logic:
// importedQty (Đã nhập)
// stockQty (Tồn kho còn lại)
// consumedQty (Đã tiêu thụ = trừ khi customer mua/thanh toán)
// excessQty (Tiêu hao vượt = consumedQty - importedQty)
// variancePercent ( (excessQty / importedQty) * 100 )
export const MOCK_CONSUMPTION_ITEMS = [
  {
    id: "ING-001",
    name: "Thịt bò Úc nhập khẩu",
    category: "Thịt & Hải sản",
    unit: "kg",
    importedQty: 150,
    stockQty: 0, // Tồn kho đã = 0, nhưng bếp vẫn nấu thêm do thanh toán order
    consumedQty: 177.75, // Đã tiêu thụ 177.75 kg
    excessQty: 27.75, // 177.75 - 150
    variancePercent: 18.5,
    status: "Cần kiểm tra",
  },
  {
    id: "ING-002",
    name: "Dầu ăn Tường An 5L",
    category: "Gia vị & Dầu",
    unit: "Lít",
    importedQty: 200,
    stockQty: 0,
    consumedQty: 228.4,
    excessQty: 28.4,
    variancePercent: 14.2,
    status: "Cần kiểm tra",
  },
  {
    id: "ING-003",
    name: "Sữa tươi Vinamilk 1L",
    category: "Bơ sữa & Đồ uống",
    unit: "Hộp",
    importedQty: 300,
    stockQty: 5,
    consumedQty: 337.5,
    excessQty: 37.5,
    variancePercent: 12.5,
    status: "Sắp hết hạn",
  },
  {
    id: "ING-004",
    name: "Bột mì đa dụng Số 11",
    category: "Bột & Ngũ cốc",
    unit: "kg",
    importedQty: 500,
    stockQty: 12,
    consumedQty: 559.0,
    excessQty: 59.0,
    variancePercent: 11.8,
    status: "Cần kiểm tra",
  },
  {
    id: "ING-005",
    name: "Gạo Tám Thái cao cấp",
    category: "Lương thực",
    unit: "kg",
    importedQty: 400,
    stockQty: 45,
    consumedQty: 444.8,
    excessQty: 44.8,
    variancePercent: 11.2,
    status: "Bình thường",
  },
  {
    id: "ING-006",
    name: "Cánh gà tươi CP",
    category: "Thịt & Hải sản",
    unit: "kg",
    importedQty: 250,
    stockQty: 8,
    consumedQty: 276.5,
    excessQty: 26.5,
    variancePercent: 10.6,
    status: "Sắp hết",
  },
  {
    id: "ING-007",
    name: "Đường tinh luyện Biên Hòa",
    category: "Gia vị & Dầu",
    unit: "kg",
    importedQty: 180,
    stockQty: 35,
    consumedQty: 196.2,
    excessQty: 16.2,
    variancePercent: 9.0,
    status: "Bình thường",
  },
  {
    id: "ING-008",
    name: "Tôm hùm Nha Trang tươi",
    category: "Thịt & Hải sản",
    unit: "kg",
    importedQty: 80,
    stockQty: 2,
    consumedQty: 86.8,
    excessQty: 6.8,
    variancePercent: 8.5,
    status: "Sắp hết",
  },
  {
    id: "ING-009",
    name: "Trứng gà công nghiệp",
    category: "Thịt & Trứng",
    unit: "Quả",
    importedQty: 1000,
    stockQty: 180,
    consumedQty: 1076.0,
    excessQty: 76.0,
    variancePercent: 7.6,
    status: "Bình thường",
  },
  {
    id: "ING-010",
    name: "Bơ lạt Anchor 250g",
    category: "Bơ sữa & Đồ uống",
    unit: "Miếng",
    importedQty: 120,
    stockQty: 15,
    consumedQty: 128.4,
    excessQty: 8.4,
    variancePercent: 7.0,
    status: "Sắp hết hạn",
  },
  {
    id: "ING-011",
    name: "Cà chua Đà Lạt fresh",
    category: "Rau củ quả",
    unit: "kg",
    importedQty: 90,
    stockQty: 0,
    consumedQty: 95.4,
    excessQty: 5.4,
    variancePercent: 6.0,
    status: "Hết hàng",
  },
  {
    id: "ING-012",
    name: "Hành tây củ lớn",
    category: "Rau củ quả",
    unit: "kg",
    importedQty: 110,
    stockQty: 0,
    consumedQty: 115.5,
    excessQty: 5.5,
    variancePercent: 5.0,
    status: "Hết hàng",
  },
];

// Top 10 Variance Ingredients sorted by variancePercent descending
export const TOP_CONSUMPTION_VARIANCE_DATA = [...MOCK_CONSUMPTION_ITEMS]
  .sort((a, b) => b.variancePercent - a.variancePercent)
  .slice(0, 10);

// ============================================================================
// 4. SHELF-LIFE MONITORING DATA (HẠN SỬ DỤNG & KIỂM TRA)
// ============================================================================
export const MOCK_EXPIRING_INGREDIENTS = [
  {
    id: "EXP-001",
    name: "Sữa tươi Vinamilk 1L",
    expiryDate: dayjs().add(3, "day").format("DD/MM/YYYY"),
    daysRemaining: 3,
    status: "Nguy cơ cao",
    quantity: 15,
    unit: "Hộp",
  },
  {
    id: "EXP-002",
    name: "Bơ lạt Anchor 250g",
    expiryDate: dayjs().add(5, "day").format("DD/MM/YYYY"),
    daysRemaining: 5,
    status: "Nguy cơ cao",
    quantity: 12,
    unit: "Miếng",
  },
  {
    id: "EXP-003",
    name: "Whipping Cream Elle & Vire",
    expiryDate: dayjs().add(7, "day").format("DD/MM/YYYY"),
    daysRemaining: 7,
    status: "Cần chú ý",
    quantity: 8,
    unit: "Hộp",
  },
  {
    id: "EXP-004",
    name: "Cá hồi Na Uy phi lê",
    expiryDate: dayjs().add(8, "day").format("DD/MM/YYYY"),
    daysRemaining: 8,
    status: "Cần chú ý",
    quantity: 6.5,
    unit: "kg",
  },
  {
    id: "EXP-005",
    name: "Xà lách thuỷ canh Đà Lạt",
    expiryDate: dayjs().add(9, "day").format("DD/MM/YYYY"),
    daysRemaining: 9,
    status: "Cần chú ý",
    quantity: 14,
    unit: "kg",
  },
  {
    id: "EXP-006",
    name: "Bánh mì hamburger tươi",
    expiryDate: dayjs().add(10, "day").format("DD/MM/YYYY"),
    daysRemaining: 10,
    status: "Cần chú ý",
    quantity: 50,
    unit: "Cái",
  },
];

export const MOCK_INSPECTION_NEEDED_INGREDIENTS = [
  {
    id: "INS-001",
    name: "Thịt bò Úc nhập khẩu",
    lastCheckedDate: dayjs().subtract(2, "day").format("DD/MM/YYYY HH:mm"),
    inspector: "Nguyễn Văn Hùng",
    status: "Chưa kiểm tra hôm nay",
    isCheckedToday: false,
    reason: "Sai số tiêu hao > 10%",
  },
  {
    id: "INS-002",
    name: "Dầu ăn Tường An 5L",
    lastCheckedDate: dayjs().subtract(1, "day").format("DD/MM/YYYY HH:mm"),
    inspector: "Trần Thị Mai",
    status: "Chưa kiểm tra hôm nay",
    isCheckedToday: false,
    reason: "Biến động tồn kho bất thường",
  },
  {
    id: "INS-003",
    name: "Bột mì đa dụng Số 11",
    lastCheckedDate: dayjs().subtract(3, "day").format("DD/MM/YYYY HH:mm"),
    inspector: "Lê Hoàng Nam",
    status: "Chưa kiểm tra hôm nay",
    isCheckedToday: false,
    reason: "Thiếu thông tin hạn sử dụng",
  },
  {
    id: "INS-004",
    name: "Tôm hùm Nha Trang tươi",
    lastCheckedDate: dayjs().subtract(1, "day").format("DD/MM/YYYY HH:mm"),
    inspector: "Phạm Quốc Tuấn",
    status: "Chưa kiểm tra hôm nay",
    isCheckedToday: false,
    reason: "Tồn kho sắp hết ngưỡng tối thiểu",
  },
  {
    id: "INS-005",
    name: "Nước mắm Phú Quốc 40 đạm",
    lastCheckedDate: dayjs().subtract(4, "day").format("DD/MM/YYYY HH:mm"),
    inspector: "Vũ Minh Anh",
    status: "Chưa kiểm tra hôm nay",
    isCheckedToday: false,
    reason: "Kiểm tra định kỳ hàng tuần",
  },
  {
    id: "INS-006",
    name: "Cánh gà tươi CP",
    lastCheckedDate: dayjs().subtract(2, "day").format("DD/MM/YYYY HH:mm"),
    inspector: "Đặng Tiến Dũng",
    status: "Chưa kiểm tra hôm nay",
    isCheckedToday: false,
    reason: "Nguy cơ lệch trọng lượng",
  },
];

// ============================================================================
// 5. INVENTORY DETAIL LEDGER REPORT
// ============================================================================
export const MOCK_DETAIL_LEDGER_ITEMS = Array.from({ length: 35 }, (_, i) => {
  const codeNum = String(100 + i).padStart(4, "0");
  const types = ["Nhập kho", "Xuất kho (Bếp)", "Điều chỉnh", "Xuất hủy", "Sản xuất"];
  const transactionType = types[i % types.length];

  const ingredients = [
    { name: "Thịt bò Úc nhập khẩu", unit: "kg" },
    { name: "Dầu ăn Tường An 5L", unit: "Lít" },
    { name: "Sữa tươi Vinamilk 1L", unit: "Hộp" },
    { name: "Bột mì đa dụng Số 11", unit: "kg" },
    { name: "Cánh gà tươi CP", unit: "kg" },
    { name: "Gạo Tám Thái cao cấp", unit: "kg" },
    { name: "Cà chua Đà Lạt fresh", unit: "kg" },
  ];
  const selectedIng = ingredients[i % ingredients.length];

  let importQty = 0;
  let exportQty = 0;
  let adjustQty = 0;
  let qty = Math.round((5 + (i * 3.5) % 80) * 10) / 10;

  if (transactionType === "Nhập kho") {
    importQty = qty;
  } else if (transactionType === "Xuất kho (Bếp)" || transactionType === "Xuất hủy") {
    exportQty = qty;
  } else {
    adjustQty = (i % 2 === 0 ? 1 : -1) * (qty / 2);
  }

  const creators = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thị Dung"];

  return {
    id: `TXN-${codeNum}`,
    time: dayjs().subtract(i % 10, "day").subtract(i * 2, "hour").format("DD/MM/YYYY HH:mm"),
    docCode: `PNK-${codeNum}`,
    transactionType,
    ingredientName: selectedIng.name,
    unit: selectedIng.unit,
    quantity: qty,
    importQty,
    exportQty,
    adjustQty,
    createdBy: creators[i % creators.length],
    note: i % 3 === 0 ? "Kiểm kê định kỳ ca sáng" : i % 5 === 0 ? "Nhập từ nhà cung cấp CP Food" : "Tự động trừ kho theo đơn hàng POS",
  };
});

// ============================================================================
// 6. OPERATIONAL ALERTS LIST
// ============================================================================
export const MOCK_OPERATIONAL_ALERTS = [
  {
    id: "ALT-001",
    severity: "danger",
    type: "threshold",
    title: "Tiêu hao vượt ngưỡng cảnh báo: Thịt bò Úc nhập khẩu",
    message: "Thịt bò Úc tiêu hao vượt 18.5% (Vượt mức cho phép 10.0%). Cần kiểm tra định lượng chế biến bếp.",
    timestamp: "Hôm nay 09:30",
    actionRequired: "Kiểm tra bếp",
  },
  {
    id: "ALT-002",
    severity: "danger",
    type: "threshold",
    title: "Tiêu hao vượt ngưỡng cảnh báo: Dầu ăn Tường An 5L",
    message: "Dầu ăn Tường An tiêu hao vượt 14.2% (Vượt mức cho phép 10.0%). Khuyến nghị rà soát quy trình chiên rán.",
    timestamp: "Hôm nay 08:15",
    actionRequired: "Rà soát định lượng",
  },
  {
    id: "ALT-003",
    severity: "danger",
    type: "out_of_stock",
    title: "Nguyên liệu đã hết hàng trong kho",
    message: "Có 3 nguyên liệu đã hết hàng hoàn toàn (Cà chua Đà Lạt, Hành tây, Ớt chuông). Ảnh hưởng 5 món ăn trong Menu.",
    timestamp: "Hôm nay 07:00",
    actionRequired: "Tạo phiếu nhập khẩn",
  },
  {
    id: "ALT-004",
    severity: "warning",
    type: "expiring",
    title: "Nguyên liệu sắp hết hạn sử dụng",
    message: "Có 6 nguyên liệu sắp hết hạn trong vòng 10 ngày tới (Sữa tươi Vinamilk còn 3 ngày, Bơ Anchor còn 5 ngày).",
    timestamp: "Hôm qua 17:45",
    actionRequired: "Ưu tiên xuất dùng",
  },
  {
    id: "ALT-005",
    severity: "warning",
    type: "low_stock",
    title: "Nguyên liệu dưới định mức tối thiểu",
    message: "Có 5 nguyên liệu sắp chạm ngưỡng tồn kho tối thiểu (Cánh gà tươi, Tôm hùm, Thịt bò Úc...).",
    timestamp: "Hôm qua 14:20",
    actionRequired: "Lên kế hoạch đặt hàng",
  },
  {
    id: "ALT-006",
    severity: "info",
    type: "inspection",
    title: "Cảnh báo kiểm tra định kỳ nguyên liệu",
    message: "Có 8 nguyên liệu chưa được kiểm tra chất lượng & số lượng thực tế trong ngày hôm nay.",
    timestamp: "Hôm nay 10:00",
    actionRequired: "Tiến hành kiểm kê",
  },
];
