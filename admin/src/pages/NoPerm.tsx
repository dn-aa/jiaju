// ============================================================
// 【代码段功能】无权限页（BR-1.2 兜底）
//   直接访问无权限路由时展示（原型 no-perm 空态）
// ============================================================
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function NoPerm() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="当前角色无此模块权限"
      subTitle="如有需要，请联系超级管理员分配权限（BR-10.2 角色权限配置）"
      extra={
        <Button type="primary" onClick={() => navigate('/dashboard', { replace: true })}>
          返回工作台
        </Button>
      }
    />
  );
}
