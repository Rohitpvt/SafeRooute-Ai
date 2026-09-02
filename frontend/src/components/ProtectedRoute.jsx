import React from 'react';
import PropTypes from 'prop-types';

export const ProtectedRoute = ({ children }) => {
  // Authentication route guard stub
  return <>{children}</>;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
