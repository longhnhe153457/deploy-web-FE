import { useState, useEffect } from "react";
import { Modal, Button, Space, Typography } from "antd";
import { EnvironmentOutlined, CheckOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * MapPickerModal - Modal chọn tọa độ địa điểm trực tiếp trên bản đồ Leaflet (OpenStreetMap)
 * @param {boolean} open Trạng thái mở modal
 * @param {function} onClose Callback khi đóng modal
 * @param {function} onSelect Callback khi xác nhận: (lat, lng) => void
 * @param {number} initialLat Vĩ độ mặc định ban đầu
 * @param {number} initialLng Kinh độ mặc định ban đầu
 */
const MapPickerModal = ({ open, onClose, onSelect, initialLat, initialLng }) => {
  const [coords, setCoords] = useState({
    lat: initialLat || 10.762622,
    lng: initialLng || 106.660172,
  });

  useEffect(() => {
    if (open) {
      setCoords({
        lat: initialLat || 10.762622,
        lng: initialLng || 106.660172,
      });
    }
  }, [open, initialLat, initialLng]);

  // Nghe sự kiện postMessage gửi từ iframe Leaflet
  useEffect(() => {
    const handleMapMessage = (event) => {
      if (event.data && event.data.type === "location-change") {
        setCoords({
          lat: event.data.lat,
          lng: event.data.lng,
        });
      }
    };

    window.addEventListener("message", handleMapMessage);
    return () => {
      window.removeEventListener("message", handleMapMessage);
    };
  }, []);

  const handleConfirm = () => {
    onSelect(coords.lat, coords.lng);
    onClose();
  };

  // Cấu hình srcDoc cho iframe
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #search-container {
      position: absolute;
      top: 10px;
      left: 50px;
      z-index: 1000;
      background: white;
      padding: 8px;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      gap: 5px;
      width: 320px;
    }
    #search-input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 13px;
    }
    #search-button {
      background: #1890ff;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    #search-button:hover {
      background: #40a9ff;
    }
    #info-box {
      position: absolute;
      bottom: 10px;
      left: 10px;
      z-index: 1000;
      background: rgba(255,255,255,0.9);
      padding: 8px 12px;
      border-radius: 6px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      font-size: 11px;
      color: #333;
    }
  </style>
</head>
<body>
  <div id="search-container">
    <input type="text" id="search-input" placeholder="Tìm địa chỉ (ví dụ: 123 Nguyễn Trãi)..." />
    <button id="search-button">Tìm</button>
  </div>
  <div id="info-box">Vĩ độ: <span id="lat">--</span> | Kinh độ: <span id="lng">--</span></div>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var initialLat = ${coords.lat};
    var initialLng = ${coords.lng};

    var map = L.map('map').setView([initialLat, initialLng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var marker = L.marker([initialLat, initialLng], {
      draggable: true
    }).addTo(map);

    function updateCoords(lat, lng) {
      document.getElementById('lat').innerText = lat.toFixed(6);
      document.getElementById('lng').innerText = lng.toFixed(6);
      window.parent.postMessage({ type: 'location-change', lat: lat, lng: lng }, '*');
    }

    updateCoords(initialLat, initialLng);

    marker.on('dragend', function (e) {
      var position = marker.getLatLng();
      updateCoords(position.lat, position.lng);
    });

    map.on('click', function (e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;
      marker.setLatLng([lat, lng]);
      updateCoords(lat, lng);
    });

    document.getElementById('search-button').addEventListener('click', doSearch);
    document.getElementById('search-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') doSearch();
    });

    function doSearch() {
      var query = document.getElementById('search-input').value;
      if (!query.trim()) return;
      
      fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query))
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (data && data.length > 0) {
            var lat = parseFloat(data[0].lat);
            var lng = parseFloat(data[0].lon);
            map.setView([lat, lng], 17);
            marker.setLatLng([lat, lng]);
            updateCoords(lat, lng);
          } else {
            alert('Không tìm thấy địa điểm. Hãy nhập chi tiết hơn (ví dụ kèm tỉnh/thành phố).');
          }
        })
        .catch(function(err) {
          console.error(err);
          alert('Lỗi kết nối mạng khi định vị.');
        });
    }
  </script>
</body>
</html>
  `;

  return (
    <Modal
      title={
        <Space>
          <EnvironmentOutlined style={{ color: "#ff4d4f" }} />
          <span>Chọn vị trí chính xác của quán trên bản đồ</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={720}
      style={{ top: 30 }}
      footer={[
        <Button key="close" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="confirm"
          type="primary"
          icon={<CheckOutlined />}
          onClick={handleConfirm}
        >
          Xác nhận vị trí
        </Button>,
      ]}
      destroyOnHidden
    >
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Kéo ghim hoặc click trực tiếp lên bản đồ để chọn tọa độ chính xác của quán. Bạn có thể sử dụng ô tìm kiếm để định vị khu vực nhanh hơn.
        </Text>
      </div>
      <div style={{ height: 420, border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
        {open && (
          <iframe
            srcDoc={mapHtml}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Bản đồ chọn tọa độ chi nhánh"
          />
        )}
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyBetween: "space-between", background: "#f5f5f5", padding: "8px 12px", borderRadius: 6 }}>
        <Text strong>Tọa độ đã chọn:</Text>
        <Text style={{ marginLeft: 8 }}>
          Vĩ độ: <Text code>{coords.lat.toFixed(6)}</Text> | Kinh độ: <Text code>{coords.lng.toFixed(6)}</Text>
        </Text>
      </div>
    </Modal>
  );
};

export default MapPickerModal;
