import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  Switch,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  message,
  Empty,
  Badge,
  Descriptions,
  Upload,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TagOutlined,
  FolderOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
  BookOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  getAllGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../api/groupApi';
import {
  getAllProcessed,
  createProcessed,
  updateProcessed,
  deleteProcessed,
} from '../api/processedProductApi';
import { getAllUnits } from '../api/unitApi';
import { getAllChains } from '../api/chainApi';
import { createImage, uploadImage } from '../api/imageApi';
import { getAllIngredients, getAllRegularProducts } from '../api/ingredientApi';

const { TextArea } = Input;
const { Option } = Select;

const MenuManagementPage = () => {
  // ─── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [units, setUnits] = useState([]);
  const [ingredientsPool, setIngredientsPool] = useState([]); // regular + ingredient products
  const [chains, setChains] = useState([]);
  
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  
  // Search & Filter
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [dishSearchTerm, setDishSearchTerm] = useState('');
  
  // Modals state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null); // null if creating, group object if editing
  
  const [dishModalVisible, setDishModalVisible] = useState(false);
  const [currentDish, setCurrentDish] = useState(null); // null if creating, dish object if editing
  const [viewDishModalVisible, setViewDishModalVisible] = useState(false);
  const [viewingDishDetails, setViewingDishDetails] = useState(null);

  const [categoryForm] = Form.useForm();
  const [dishForm] = Form.useForm();

  // Image Upload State & Handler
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState(null);

  const handleCustomImageUpload = async ({ file, onSuccess, onError }) => {
    setUploadingImage(true);
    try {
      const res = await uploadImage(file);
      if (res.data) {
        const imgObj = res.data;
        setSelectedImageId(imgObj.id);
        dishForm.setFieldsValue({
          imageLink: imgObj.imageLink,
        });
        message.success('Tải ảnh lên Cloudinary thành công!');
        if (onSuccess) onSuccess(imgObj);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      message.error('Không thể tải ảnh lên Cloudinary.');
      if (onError) onError(err);
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── DATA FETCHING ─────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await getAllGroups();
      setCategories(res.data || []);
      // Auto select first category if none selected
      if (res.data && res.data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách danh mục.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchDishes = async () => {
    setLoadingDishes(true);
    try {
      const res = await getAllProcessed();
      setDishes(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách món ăn.');
    } finally {
      setLoadingDishes(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      // Fetch Units
      const unitsRes = await getAllUnits();
      setUnits(unitsRes.data || []);
      
      // Fetch Chains
      const chainsRes = await getAllChains();
      setChains(chainsRes.data || []);
      
      // Fetch Ingredients candidate list (Ingredient + Regular products)
      const [ingRes, regRes] = await Promise.all([
        getAllIngredients(),
        getAllRegularProducts(),
      ]);
      const combined = [
        ...(ingRes.data || []).map(item => ({ ...item, displayType: 'Nguyên liệu' })),
        ...(regRes.data || []).map(item => ({ ...item, displayType: 'Thường' })),
      ];
      setIngredientsPool(combined);
    } catch (err) {
      console.error(err);
      message.warning('Lỗi khi tải dữ liệu phụ trợ (đơn vị, nguyên liệu, chuỗi).');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchDishes();
    fetchDropdownData();
  }, []);

  // ─── CATEGORY HANDLERS ────────────────────────────────────────────────────
  const handleOpenCategoryModal = (category = null) => {
    setCurrentCategory(category);
    if (category) {
      categoryForm.setFieldsValue({ name: category.name });
    } else {
      categoryForm.resetFields();
    }
    setCategoryModalVisible(true);
  };

  const handleSaveCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (currentCategory) {
        // Edit
        await updateGroup({ id: currentCategory.id, name: values.name });
        message.success('Cập nhật danh mục thành công.');
      } else {
        // Create
        const res = await createGroup({ name: values.name });
        message.success('Thêm danh mục thành công.');
        if (res.data) {
          setSelectedCategoryId(res.data.id);
        }
      }
      setCategoryModalVisible(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu danh mục.';
      message.error(errMsg);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteGroup(id);
      message.success('Xóa danh mục thành công.');
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
      }
      fetchCategories();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Không thể xóa danh mục này.';
      message.error(errMsg);
    }
  };

  // ─── DISH HANDLERS ────────────────────────────────────────────────────────
  const handleOpenDishModal = (dish = null) => {
    setCurrentDish(dish);
    setSelectedImageId(dish?.imageId || null);
    if (dish) {
      // Find base unit from unitConversions
      const baseConversion = dish.unitConversions?.find(uc => !uc.baseId || uc.isBase);
      const baseUnitId = baseConversion ? baseConversion.unitId : undefined;

      // Find active recipe
      const activeRecipe = dish.recipes?.find(r => r.isActive) || dish.recipes?.[0];
      const recipeDetails = activeRecipe?.unitConversions || activeRecipe?.recipesDetaileds || activeRecipe?.details || [];

      // Transform ingredients for Form List
      const ingredients = recipeDetails.map(d => ({
        productId: d.productId,
        quantity: d.quantity,
      }));

      dishForm.setFieldsValue({
        name: dish.name,
        groupId: dish.groupId,
        chainId: dish.chainId,
        skuCode: dish.skuCode,
        sellPrice: dish.sellPrice,
        description: dish.description,
        imageLink: dish.image?.imageLink || '',
        baseUnitId: baseUnitId,
        isActive: dish.isActive,
        isSellable: dish.isSellable,
        recipeVersionName: activeRecipe?.versionName || 'Công thức 1',
        ingredients: ingredients.length > 0 ? ingredients : [{}],
      });
    } else {
      dishForm.resetFields();
      dishForm.setFieldsValue({
        groupId: selectedCategoryId,
        chainId: chains[0]?.id,
        isActive: true,
        isSellable: true,
        recipeVersionName: 'Công thức tiêu chuẩn',
        ingredients: [{}],
      });
    }
    setDishModalVisible(true);
  };

  const handleSaveDish = async () => {
    try {
      const values = await dishForm.validateFields();
      
      // Validation: Must select base unit
      if (!values.baseUnitId) {
        message.error('Vui lòng chọn đơn vị cơ bản.');
        return;
      }

      // Validation: Recipe must have at least one ingredient
      const validIngredients = values.ingredients?.filter(i => i.productId && i.quantity > 0) || [];
      if (validIngredients.length === 0) {
        message.error('Món ăn loại chế biến bắt buộc phải có tối thiểu 1 nguyên liệu trong công thức.');
        return;
      }

      // Setup unitConversions payload (only one base unit allowed for processed type)
      const unitConversions = [
        {
          unitId: values.baseUnitId,
          isBase: true,
          conversionPoint: 1.0,
        }
      ];

      // Setup recipe payload
      const recipe = validIngredients.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
      }));

      // Construct request body
      const payload = {
        groupId: values.groupId,
        chainId: values.chainId,
        name: values.name,
        description: values.description || '',
        skuCode: values.skuCode || '',
        isSellable: values.isSellable,
        sellPrice: values.sellPrice,
        unitConversions,
        recipe,
      };

      // Handle ImageId creation if imageLink provided or file uploaded
      let imageIdToUse = selectedImageId || currentDish?.imageId;

      if (values.imageLink && !imageIdToUse) {
        try {
          const imgRes = await createImage({ imageLink: values.imageLink });
          if (imgRes.data && imgRes.data.id) {
            imageIdToUse = imgRes.data.id;
          }
        } catch {
          // Fallback
        }
      }

      if (imageIdToUse) {
        payload.imageId = imageIdToUse;
      }

      if (currentDish) {
        // Update
        const updatePayload = {
          id: currentDish.id,
          ...payload,
        };
        await updateProcessed(updatePayload);
        message.success('Cập nhật món ăn thành công.');
      } else {
        // Create
        await createProcessed(payload);
        message.success('Thêm món ăn thành công.');
      }

      setDishModalVisible(false);
      fetchDishes();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng kiểm tra lại thông tin nhập.';
      message.error(errMsg);
    }
  };

  const handleDeleteDish = async (id) => {
    try {
      await deleteProcessed(id);
      message.success('Xóa món ăn thành công.');
      fetchDishes();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Không thể xóa món ăn này.';
      message.error(errMsg);
    }
  };

  const handleToggleDishStatus = async (dish) => {
    try {
      const baseConversion = dish.unitConversions?.find(uc => !uc.baseId || uc.isBase);
      const baseUnitId = baseConversion ? baseConversion.unitId : undefined;
      const activeRecipe = dish.recipes?.find(r => r.isActive) || dish.recipes?.[0];
      const recipeDetails = activeRecipe?.recipesDetaileds || activeRecipe?.details || [];

      const payload = {
        id: dish.id,
        groupId: dish.groupId,
        chainId: dish.chainId,
        name: dish.name,
        description: dish.description,
        skuCode: dish.skuCode,
        isActive: !dish.isActive, // Toggle
        isSellable: dish.isSellable,
        sellPrice: dish.sellPrice,
        imageId: dish.imageId,
        unitConversions: [
          {
            unitId: baseUnitId,
            isBase: true,
            conversionPoint: 1.0,
          }
        ],
        recipe: recipeDetails.map(d => ({
          productId: d.productId,
          quantity: d.quantity,
        }))
      };

      await updateProcessed(payload);
      message.success(`Đã ${!dish.isActive ? 'kích hoạt' : 'ngừng hoạt động'} món ăn.`);
      fetchDishes();
    } catch (err) {
      console.error(err);
      message.error('Không thể thay đổi trạng thái món ăn.');
    }
  };

  const handleViewDishDetails = (dish) => {
    // Find base unit name
    const baseConversion = dish.unitConversions?.find(uc => !uc.baseId || uc.isBase);
    const unitName = units.find(u => u.id === baseConversion?.unitId)?.name || 'Chưa xác định';

    // Find active recipe
    const activeRecipe = dish.recipes?.find(r => r.isActive) || dish.recipes?.[0];
    const details = activeRecipe?.recipesDetaileds || activeRecipe?.details || [];
    
    const ingredientsWithNames = details.map(d => {
      const ing = ingredientsPool.find(p => p.id === d.productId);
      const ingUnit = units.find(u => u.id === ing?.unitConversions?.find(uc => uc.isBase)?.unitId)?.name || '';
      return {
        name: ing?.name || `Sản phẩm #${d.productId}`,
        quantity: d.quantity,
        unit: ingUnit,
        type: ing?.displayType || 'Nguyên liệu',
      };
    });

    setViewingDishDetails({
      ...dish,
      unitName,
      recipeName: activeRecipe?.versionName || 'Công thức tiêu chuẩn',
      ingredients: ingredientsWithNames,
    });
    setViewDishModalVisible(true);
  };

  // ─── HELPER MAPPERS & FILTERS ──────────────────────────────────────────────
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

  const filteredDishes = dishes.filter(d => {
    const matchesCategory = selectedCategoryId ? d.groupId === selectedCategoryId : true;
    const matchesSearch = d.name.toLowerCase().includes(dishSearchTerm.toLowerCase()) || 
                          d.skuCode.toLowerCase().includes(dishSearchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDishCountInCategory = (catId) => {
    return dishes.filter(d => d.groupId === catId).length;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="menu-management-page" style={{ padding: '0 8px' }}>
      {/* HEADER BANNER */}
      <div className="home-banner" style={{ marginBottom: 24 }}>
        <div className="home-banner-content">
          <h1 className="home-banner-title">
            Quản lý <span>Thực đơn</span> 🍜
          </h1>
          <p className="home-banner-subtitle">
            Tổ chức danh mục thực đơn và định lượng công thức chế biến các món ăn
          </p>
        </div>
        <div className="home-banner-emoji"><BookOutlined /></div>
      </div>

      <Row gutter={[24, 24]}>
        {/* ============================================================== */}
        {/* CỘT TRÁI: DANH MỤC (GROUPS) */}
        {/* ============================================================== */}
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <FolderOutlined style={{ color: 'var(--color-primary)' }} />
                <span>Danh mục món ăn</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => handleOpenCategoryModal()}
                className="login-btn-primary"
                style={{ height: 32 }}
              >
                Thêm mới
              </Button>
            }
            className="stat-card"
            style={{ borderRadius: 'var(--border-radius)', minHeight: 600, border: '1px solid var(--color-border)' }}
          >
            {/* Search Categories */}
            <Input
              placeholder="Tìm danh mục..."
              prefix={<SearchOutlined style={{ color: 'var(--color-text-secondary)' }} />}
              value={categorySearchTerm}
              onChange={(e) => setCategorySearchTerm(e.target.value)}
              style={{ marginBottom: 16, borderRadius: 'var(--border-radius-sm)' }}
              allowClear
            />

            {loadingCategories ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>Đang tải danh mục...</div>
            ) : filteredCategories.length === 0 ? (
              <Empty description="Không có danh mục nào" />
            ) : (
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const dishCount = getDishCountInCategory(cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`category-item-row ${isSelected ? 'active' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        marginBottom: 8,
                        borderRadius: 'var(--border-radius-sm)',
                        cursor: 'pointer',
                        background: isSelected ? '#fff2f0' : 'rgba(0,0,0,0.02)',
                        borderLeft: isSelected ? '4px solid var(--color-primary)' : '4px solid transparent',
                        transition: 'var(--transition)',
                      }}
                    >
                      <Space>
                        <TagOutlined style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                        <span style={{ fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {cat.name}
                        </span>
                        <Badge
                          count={dishCount}
                          style={{
                            backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            marginLeft: 4,
                          }}
                        />
                      </Space>

                      {/* Actions */}
                      <Space size="small" className="category-actions-group">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCategoryModal(cat);
                          }}
                        />
                        <Popconfirm
                          title="Xóa danh mục này sẽ không ảnh hưởng tới món ăn nhưng nên thận trọng. Bạn chắc chắn?"
                          onConfirm={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id);
                          }}
                          onCancel={(e) => e.stopPropagation()}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </Space>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* ============================================================== */}
        {/* CỘT PHẢI: MÓN ĂN (DISHES / PROCESSED PRODUCTS) */}
        {/* ============================================================== */}
        <Col xs={24} md={16}>
          <Card
            title={
              <Space>
                <BookOutlined style={{ color: 'var(--color-primary)' }} />
                <span>
                  Danh sách món ăn: {categories.find(c => c.id === selectedCategoryId)?.name || 'Tất cả'}
                </span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!selectedCategoryId}
                onClick={() => handleOpenDishModal()}
                className="login-btn-primary"
                style={{ height: 32 }}
              >
                Thêm món ăn mới
              </Button>
            }
            className="stat-card"
            style={{ borderRadius: 'var(--border-radius)', minHeight: 600, border: '1px solid var(--color-border)' }}
          >
            {/* Search & Statistics Header */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <Input
                placeholder="Tìm món ăn theo tên hoặc SKU..."
                prefix={<SearchOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                value={dishSearchTerm}
                onChange={(e) => setDishSearchTerm(e.target.value)}
                style={{ flex: 1, borderRadius: 'var(--border-radius-sm)' }}
                allowClear
              />
            </div>

            {loadingDishes ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>Đang tải danh sách món ăn...</div>
            ) : filteredDishes.length === 0 ? (
              <Empty description={selectedCategoryId ? "Không có món ăn nào trong danh mục này" : "Hãy chọn danh mục ở cột trái"} />
            ) : (
              <Row gutter={[16, 16]}>
                {filteredDishes.map((dish) => {
                  const baseUnitId = dish.unitConversions?.find(uc => uc.isBase)?.unitId;
                  const baseUnitName = units.find(u => u.id === baseUnitId)?.name || 'Đĩa';

                  return (
                    <Col xs={24} sm={12} lg={8} key={dish.id}>
                      <Card
                        hoverable
                        cover={
                          <div style={{ height: 160, position: 'relative', overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {dish.image?.imageLink ? (
                              <img
                                alt={dish.name}
                                src={dish.image.imageLink}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <span style={{ fontSize: 48 }}>🍲</span>
                            )}
                          </div>
                        }
                        actions={[
                          <Tooltip title="Xem chi tiết" key="view">
                            <EyeOutlined onClick={() => handleViewDishDetails(dish)} />
                          </Tooltip>,
                          <Tooltip title="Chỉnh sửa" key="edit">
                            <EditOutlined onClick={() => handleOpenDishModal(dish)} />
                          </Tooltip>,
                          <Popconfirm
                            title="Xác nhận xóa món ăn này?"
                            onConfirm={() => handleDeleteDish(dish.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                            key="delete"
                          >
                            <Tooltip title="Xóa">
                              <DeleteOutlined style={{ color: 'var(--color-primary)' }} />
                            </Tooltip>
                          </Popconfirm>
                        ]}
                        style={{
                          borderRadius: 'var(--border-radius-sm)',
                          overflow: 'hidden',
                          border: '1px solid var(--color-border)',
                          transition: 'var(--transition)'
                        }}
                      >
                        <Card.Meta
                          title={<div style={{ fontSize: 16, fontWeight: 700 }}>{dish.name}</div>}
                          description={
                            <Space direction="vertical" size={1} style={{ width: '100%' }}>
                              <div style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 600 }}>
                                {formatPrice(dish.sellPrice)} / {baseUnitName}
                              </div>
                              {dish.skuCode && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>SKU: {dish.skuCode}</div>}
                              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {dish.description || 'Chưa có mô tả.'}
                              </div>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {/* ============================================================== */}
      {/* MODAL: DANH MỤC (CATEGORY) */}
      {/* ============================================================== */}
      <Modal
        title={currentCategory ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}
        open={categoryModalVisible}
        onOk={handleSaveCategory}
        onCancel={() => setCategoryModalVisible(false)}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={categoryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[
              { required: true, message: 'Vui lòng nhập tên danh mục.' },
              { max: 255, message: 'Tối đa 255 ký tự.' }
            ]}
          >
            <Input placeholder="Ví dụ: Món khai vị, Lẩu, Trà sữa..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: MÓN ĂN (DISH) */}
      {/* ============================================================== */}
      <Modal
        title={currentDish ? "Chỉnh sửa món ăn" : "Thêm món ăn mới"}
        open={dishModalVisible}
        onOk={handleSaveDish}
        onCancel={() => setDishModalVisible(false)}
        okText="Lưu lại"
        cancelText="Hủy bỏ"
        width={720}
        destroyOnHidden
      >
        <Form form={dishForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên món ăn"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên món ăn.' },
                  { max: 255, message: 'Tối đa 255 ký tự.' }
                ]}
              >
                <Input placeholder="Nhập tên món ăn đầy đủ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="skuCode"
                label="Mã SKU (nếu có)"
                rules={[{ max: 255, message: 'Tối đa 255 ký tự.' }]}
              >
                <Input placeholder="Mã SKU quản lý kho" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="groupId"
                label="Danh mục"
                rules={[{ required: true, message: 'Vui lòng chọn danh mục.' }]}
              >
                <Select placeholder="Chọn danh mục">
                  {categories.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="baseUnitId"
                label="Đơn vị tính cơ bản"
                rules={[{ required: true, message: 'Chọn đơn vị cơ bản.' }]}
              >
                <Select placeholder="Ví dụ: Đĩa, Bát, Ly">
                  {units.map(u => (
                    <Option key={u.id} value={u.id}>{u.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="sellPrice"
                label="Giá bán (VND)"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá bán.' },
                  { type: 'number', min: 0, message: 'Giá không được âm.' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => (value != null && value !== '' ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                  parser={value => (value ? value.replace(/\$\s?|(,*)/g, '') : '')}
                  placeholder="Giá bán của món ăn"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Hình ảnh món ăn">
                <Form.Item name="imageLink" noStyle>
                  <Input type="hidden" />
                </Form.Item>
                <Upload
                  name="file"
                  listType="picture-card"
                  showUploadList={false}
                  customRequest={handleCustomImageUpload}
                  accept="image/*"
                  style={{ width: 120, height: 120 }}
                >
                  {dishForm.getFieldValue('imageLink') ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 8 }}>
                      <img
                        src={dishForm.getFieldValue('imageLink')}
                        alt="dish"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      {uploadingImage ? <Spin /> : <UploadOutlined style={{ fontSize: 26, color: '#1890ff' }} />}
                      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
                        {uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}
                      </div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="chainId"
                label="Thuộc Chuỗi nhà hàng"
                rules={[{ required: true, message: 'Vui lòng chọn chuỗi.' }]}
              >
                <Select placeholder="Chọn chuỗi áp dụng">
                  {chains.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả chi tiết">
            <TextArea rows={2} placeholder="Nhập giới thiệu ngắn về món ăn..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isSellable" label="Cho phép bán" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="recipeVersionName"
                label="Tên phiên bản công thức"
                rules={[{ required: true, message: 'Nhập tên phiên bản.' }]}
              >
                <Input placeholder="Ví dụ: Công thức 2026, Bản cải tiến..." />
              </Form.Item>
            </Col>
          </Row>

          {/* RECIPE BUILDER */}
          <Card
            title="Định lượng nguyên liệu (Công thức)"
            size="small"
            style={{ marginTop: 12, backgroundColor: '#fafafa', borderRadius: 'var(--border-radius-sm)' }}
          >
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              ⚠️ Món ăn thuộc loại Chế biến (Processed Product) bắt buộc phải cấu hình tối thiểu 1 nguyên liệu.
            </p>
            <Form.List name="ingredients">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row gutter={16} key={key} align="middle" style={{ marginBottom: 8 }}>
                      <Col span={14}>
                        <Form.Item
                          {...restField}
                          name={[name, 'productId']}
                          rules={[{ required: true, message: 'Chọn nguyên liệu' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="Chọn nguyên liệu chế biến"
                            showSearch
                            filterOption={(input, option) =>
                              (option?.label || '').toLowerCase().includes((input || '').toLowerCase())
                            }
                            options={ingredientsPool.map(p => ({
                              value: p.id,
                              label: `${p.name} (${p.displayType}) - SKU: ${p.skuCode || 'N/A'}`
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={7}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          rules={[
                            { required: true, message: 'Nhập số lượng' },
                            { type: 'number', min: 0.001, message: 'Tối thiểu 0.001' }
                          ]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            step={0.1}
                            placeholder="SL nguyên liệu"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          disabled={fields.length === 1}
                        />
                      </Col>
                    </Row>
                  ))}
                  <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Thêm nguyên liệu
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Card>
        </Form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: XEM CHI TIẾT MÓN ĂN */}
      {/* ============================================================== */}
      <Modal
        title={
          <Space>
            <BookOutlined style={{ color: 'var(--color-primary)' }} />
            <span>Chi tiết món ăn</span>
          </Space>
        }
        open={viewDishModalVisible}
        onCancel={() => setViewDishModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setViewDishModalVisible(false)} className="login-btn-primary">
            Đóng lại
          </Button>
        ]}
        width={600}
      >
        {viewingDishDetails && (
          <div style={{ marginTop: 16 }}>
            {viewingDishDetails.image?.imageLink && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img
                  alt={viewingDishDetails.name}
                  src={viewingDishDetails.image.imageLink}
                  style={{ maxWith: '100%', maxHeight: 200, borderRadius: 'var(--border-radius-sm)', objectFit: 'cover' }}
                />
              </div>
            )}
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Tên món ăn">{viewingDishDetails.name}</Descriptions.Item>
              <Descriptions.Item label="Mã SKU">{viewingDishDetails.skuCode || 'Chưa cung cấp'}</Descriptions.Item>
              <Descriptions.Item label="Giá bán">
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  {formatPrice(viewingDishDetails.sellPrice)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Đơn vị tính cơ bản">{viewingDishDetails.unitName}</Descriptions.Item>
              <Descriptions.Item label="Mô tả">{viewingDishDetails.description || 'Chưa có mô tả.'}</Descriptions.Item>
              <Descriptions.Item label="Công thức ({name})" labelStyle={{ fontWeight: 600 }}>
                {viewingDishDetails.recipeName}
              </Descriptions.Item>
            </Descriptions>

            <h4 style={{ marginTop: 20, marginBottom: 8, fontSize: 14 }}>Thành phần nguyên liệu:</h4>
            {viewingDishDetails.ingredients.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>Không có nguyên liệu định lượng.</p>
            ) : (
              <div style={{ background: '#fafafa', padding: 12, borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-border)' }}>
                {viewingDishDetails.ingredients.map((ing, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: index < viewingDishDetails.ingredients.length - 1 ? '1px dashed var(--color-border)' : 'none',
                    }}
                  >
                    <Space>
                      <span style={{ fontWeight: 500 }}>{ing.name}</span>
                      <Tag color="cyan" style={{ fontSize: 10 }}>{ing.type}</Tag>
                    </Space>
                    <span style={{ fontWeight: 600 }}>
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MenuManagementPage;
