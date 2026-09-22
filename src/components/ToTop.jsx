import { useState, useEffect } from 'react';
import { UpOutlined } from '@ant-design/icons';

/**
 * Nút cuộn lên đầu trang, hiện khi scroll xuống > 300px
 */
const ToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      className="totop-btn"
      onClick={scrollToTop}
      aria-label="Cuộn lên đầu trang"
      title="Lên đầu trang"
    >
      <UpOutlined />
    </button>
  );
};

export default ToTop;
