import axiosInstance from './axiosInstance';

// ─── Menu ────────────────────────────────────────────────────────────────────
export const getAllMenus = () =>
  axiosInstance.get('/api/Menu');

export const getMenuById = (id) =>
  axiosInstance.get(`/api/Menu/${id}`);

export const createMenu = (data) =>
  axiosInstance.post('/api/Menu', data);

export const updateMenu = (data) =>
  axiosInstance.put('/api/Menu', data);

export const deleteMenu = (id) =>
  axiosInstance.delete(`/api/Menu/${id}`);

export const getMenuProducts = (menuId) =>
  axiosInstance.get(`/api/Menu/${menuId}/products`);

export const getAllGroups = (branchId = null) =>
  axiosInstance.get(branchId ? `/api/Group/sellable?branchId=${branchId}` : '/api/Group/sellable');

export const searchProductsOData = async (searchText = '', groupId = null, branchId = null) => {
  let filterClauses = ['IsSellable eq true', '(Type eq MenuGoBE.Models.Enums.ProductType\'Processed\' or Type eq MenuGoBE.Models.Enums.ProductType\'Manufactured\' or Type eq MenuGoBE.Models.Enums.ProductType\'Regular\')'];

  if (searchText) {
    filterClauses.push(`contains(Name, '${searchText}')`);
  }

  if (groupId && groupId !== 'all') {
    filterClauses.push(`GroupId eq ${groupId}`);
  }

  if (branchId) {
    filterClauses.push(`BInventories/any(b: b/BranchId eq ${branchId} and b/BranchActive eq true and b/ChainActive eq true)`);
  }

  let query = '';
  if (filterClauses.length > 0) {
    query = `?$filter=${filterClauses.join(' and ')}&$expand=Group,Image&$top=50`;
  } else {
    query = `?$expand=Group,Image&$top=50`;
  }

  const response = await axiosInstance.get(`/odata/ProductOData${query}`);
  return response.data;
};

export const getProductsODataPaged = async ({
  searchText = "",
  menuId = null,
  pageSize = 20,
  pageIndex = 1,
}) => {
  let filterClauses = ["IsSellable eq true"];

  if (searchText) {
    const escapedSearch = searchText.replace(/'/g, "''");
    filterClauses.push(`contains(tolower(Name), '${escapedSearch.toLowerCase()}')`);
  }

  if (menuId && menuId !== "all" && menuId !== "new") {
    filterClauses.push(`MenuProducts/any(mp: mp/MenuId eq ${menuId})`);
  }

  const skip = (pageIndex - 1) * pageSize;
  const filterQuery = filterClauses.length > 0 ? `$filter=${filterClauses.join(" and ")}` : "";
  const expandQuery = "$expand=Image,Group";
  const countQuery = "$count=true";
  const pagingQuery = `$top=${pageSize}&$skip=${skip}`;

  const queryParams = [filterQuery, expandQuery, countQuery, pagingQuery].filter(Boolean).join("&");
  const response = await axiosInstance.get(`/odata/ProductOData?${queryParams}`);
  return response.data;
};
