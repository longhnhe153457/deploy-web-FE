import React, { useState, useEffect } from 'react';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { createCashFlow } from '../../api/cashFlowApi';
import { getPartnersByBranch, getPartnerFinancialSummary } from '../../api/partnerApi';
import { getDebtDisplayInfo } from '../../utils/debtHelper';

const PAYMENT_METHODS = [
  { value: 1, label: 'Tiền mặt' },
  { value: 2, label: 'Thẻ' },
  { value: 3, label: 'Chuyển khoản' },
];

const CreateCashFlowModal = ({ open, onClose, onSuccess, branchId, defaultDirection }) => {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  const [partnerDebt, setPartnerDebt] = useState(null);
  const [loadingDebt, setLoadingDebt] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    direction: 2,
    totalAmount: '',
    paymentMethod: 1,
    partnerId: '',
    businessDate: dayjs().format('YYYY-MM-DDTHH:mm'),
    note: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        direction: defaultDirection ?? 2,
        totalAmount: '',
        paymentMethod: 1,
        partnerId: '',
        businessDate: dayjs().format('YYYY-MM-DDTHH:mm'),
        note: '',
      });
      setErrors({});
      setPartnerDebt(null);
      setLoading(false);

      getPartnersByBranch(branchId)
        .then((res) => {
          const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          setPartners(arr);
        })
        .catch(() => setPartners([]));
    }
  }, [open, branchId, defaultDirection]);

  useEffect(() => {
    if (!form.partnerId) {
      setPartnerDebt(null);
      return;
    }
    let isMounted = true;
    setLoadingDebt(true);
    getPartnerFinancialSummary(form.partnerId)
      .then((res) => {
        if (isMounted) setPartnerDebt(res);
      })
      .catch(() => {
        if (isMounted) setPartnerDebt(null);
      })
      .finally(() => {
        if (isMounted) setLoadingDebt(false);
      });
    return () => {
      isMounted = false;
    };
  }, [form.partnerId]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    const errs = {};
    if (!form.totalAmount || Number(form.totalAmount) <= 0)
      errs.totalAmount = 'Số tiền phải lớn hơn 0';
    if (Number(form.totalAmount) > 10_000_000_000)
      errs.totalAmount = 'Số tiền không được vượt quá 10 tỷ VNĐ';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await createCashFlow({
        branchId,
        direction: form.direction,
        totalAmount: Number(form.totalAmount),
        partnerId: form.partnerId ? Number(form.partnerId) : null,
        paymentMethod: form.paymentMethod,
        businessDate: form.businessDate
          ? new Date(form.businessDate).toISOString()
          : new Date().toISOString(),
        note: form.note,
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra';
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const isInflow = form.direction === 1;
  const accentColor = isInflow ? '#16a34a' : '#dc2626';
  const headerBgStyle = {
    background: isInflow ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #dc2626, #ef4444)'
  };
  const submitBtnBgStyle = {
    background: isInflow ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #dc2626, #ef4444)'
  };

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header" style={headerBgStyle}>
          <div className="modal-header-title-group">
            <div className="modal-header-icon">
              {isInflow ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            </div>
            <div>
              <div className="modal-header-title-text">
                {isInflow ? 'Tạo Phiếu Thu' : 'Tạo Phiếu Chi'}
              </div>
              <div className="modal-header-subtitle">
                {isInflow ? 'Ghi nhận khoản tiền nhận vào quỹ' : 'Ghi nhận khoản tiền chi ra từ quỹ'}
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Direction Toggle */}
          <div>
            <label className="form-label">Loại phiếu</label>
            <div className="form-direction-toggle-row">
              <button
                type="button"
                onClick={() => set('direction', 1)}
                className={`form-direction-toggle-btn ${form.direction === 1 ? 'active inflow' : ''}`}
              >
                <ArrowUpOutlined /> Phiếu Thu
              </button>
              <button
                type="button"
                onClick={() => set('direction', 2)}
                className={`form-direction-toggle-btn ${form.direction === 2 ? 'active outflow' : ''}`}
              >
                <ArrowDownOutlined /> Phiếu Chi
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="form-label">Số tiền <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ position: 'relative', marginTop: 4 }}>
              <input
                type="number"
                min="1"
                max="10000000000"
                placeholder="Nhập số tiền..."
                value={form.totalAmount}
                onChange={(e) => set('totalAmount', e.target.value)}
                className={`form-input ${errors.totalAmount ? 'error' : ''}`}
                style={{ paddingRight: 44 }}
              />
              <span style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                fontSize: 12, fontWeight: 700, color: accentColor,
              }}>₫</span>
            </div>
            {errors.totalAmount && <div className="form-error-msg">{errors.totalAmount}</div>}
            {form.totalAmount && !errors.totalAmount && (
              <div className="form-amount-preview">
                = {Number(form.totalAmount).toLocaleString('vi-VN')} VNĐ
              </div>
            )}
          </div>

          {/* Payment Method + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Phương thức</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => set('paymentMethod', Number(e.target.value))}
                className="form-input"
                style={{ marginTop: 4 }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Ngày thực hiện</label>
              <input
                type="datetime-local"
                value={form.businessDate}
                onChange={(e) => set('businessDate', e.target.value)}
                className="form-input"
                style={{ marginTop: 4 }}
              />
            </div>
          </div>

          {/* Partner */}
          <div>
            <label className="form-label">Đối tác (tuỳ chọn)</label>
            <select
              value={form.partnerId}
              onChange={(e) => set('partnerId', e.target.value)}
              className="form-input"
              style={{ marginTop: 4 }}
            >
              <option value="">— Không chọn đối tác —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {form.partnerId && (
              <div style={{ marginTop: 6 }}>
                {loadingDebt ? (
                  <span style={{ fontSize: 11, color: '#64748b' }}>Đang nạp công nợ đối tác...</span>
                ) : partnerDebt ? (() => {
                  const info = getDebtDisplayInfo(partnerDebt.remainingDebt);
                  return (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: info.bgColor,
                        color: info.color,
                        border: `1px solid ${info.borderColor}`
                      }}
                    >
                      <span>Tình trạng công nợ:</span>
                      <strong>{info.text}</strong>
                    </div>
                  );
                })() : null}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="form-label">Ghi chú</label>
            <textarea
              rows={2}
              maxLength={255}
              placeholder="Nhập nội dung ghi chú..."
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              className="form-input"
              style={{ marginTop: 4, resize: 'vertical', minHeight: 56, height: 'auto', padding: '6px 10px' }}
            />
          </div>

          {/* Submit error */}
          {errors.submit && (
            <div className="form-submit-error">
              {errors.submit}
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0' }} />

          {/* Actions */}
          <div className="form-actions-row">
            <button type="button" onClick={onClose} disabled={loading} className="btn-form-cancel">
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-form-submit"
              style={submitBtnBgStyle}
            >
              {loading ? 'Đang lưu...' : isInflow ? 'Tạo phiếu thu' : 'Tạo phiếu chi'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateCashFlowModal;
