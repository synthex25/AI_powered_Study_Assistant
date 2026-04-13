import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import AuthModal from './AuthModal';

const LoginPage: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-mesh">
      <AuthModal isOpen onClose={() => navigate('/', { replace: true })} />
    </div>
  );
};

export default LoginPage;
