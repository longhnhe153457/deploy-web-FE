import React, { useState, useMemo } from 'react';
import PartnerTable from './PartnerTable';
import PartnerModal from './PartnerModal';

const PartnerTab = ({ partners = [], fetchPartners, selectedBranchId }) => {
  const [searchText, setSearchText] = useState('');
  const [partnerType, setPartnerType] = useState('ALL');
  const [modalPartnerOpen, setModalPartnerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const normalizeType = (t) => {
        if (t === 1 || t === '1' || t === 'Supplier' || t === 'Nhà cung cấp' || t === 'NCC') return 'NCC';
        if (t === 2 || t === '2' || t === 'Customer' || t === 'Khách hàng' || t === 'KH') return 'KH';
        if (t === 3 || t === '3' || t === 'Transporter' || t === 'Vận chuyển' || t === 'VC') return 'VC';
        if (t === 4 || t === '4' || t === 'Other' || t === 'Khác' || t === 'Đối tác dịch vụ' || t === 'OTHER') return 'OTHER';
        return 'OTHER';
      };

      // Tuyệt đối không hiển thị Khách hàng ở trang Đối tác
      const nType = normalizeType(p.type);
      if (nType === 'KH') {
        return false;
      }

      if (partnerType !== 'ALL' && nType !== partnerType) {
        return false;
      }

      if (searchText) {
        const lower = searchText.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(lower);
        const matchPhone = p.phone?.toLowerCase().includes(lower);
        if (!matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [partners, partnerType, searchText]);

  const handleAddPartnerSuccess = () => {
    if (fetchPartners && selectedBranchId) {
      fetchPartners(selectedBranchId);
    }
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setModalPartnerOpen(true);
  };

  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đối tác này?')) return;
    try {
      const { deletePartner } = await import('../../../../api/partnerApi');
      await deletePartner(partnerId);
      if (fetchPartners && selectedBranchId) {
        fetchPartners(selectedBranchId);
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('Không thể xóa đối tác lúc này!');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <PartnerTable
        partners={filteredPartners}
        searchText={searchText}
        setSearchText={setSearchText}
        partnerType={partnerType}
        setPartnerType={setPartnerType}
        setModalPartnerOpen={(open) => {
          if (open) setEditingPartner(null);
          setModalPartnerOpen(open);
        }}
        onEdit={handleEditPartner}
        onDelete={handleDeletePartner}
        onRefresh={() => fetchPartners && selectedBranchId && fetchPartners(selectedBranchId)}
      />

      <PartnerModal
        open={modalPartnerOpen}
        onClose={() => {
          setModalPartnerOpen(false);
          setEditingPartner(null);
        }}
        onSuccess={handleAddPartnerSuccess}
        selectedBranchId={selectedBranchId}
        editingPartner={editingPartner}
      />
    </div>
  );
};

export default PartnerTab;
