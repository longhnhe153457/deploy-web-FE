import { Spin } from 'antd';

/**
 * Loading spinner
 * @param {{ fullScreen?: boolean, size?: 'small' | 'default' | 'large' }} props
 */
const Spinner = ({ fullScreen = false, size = 'large' }) => {
  if (fullScreen) {
    return (
      <div className="spinner-fullscreen">
        <Spin size={size} />
      </div>
    );
  }

  return (
    <div className="spinner-inline">
      <Spin size={size} />
    </div>
  );
};

export default Spinner;
