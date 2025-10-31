export const checkReceivingAuth = () => {
  return sessionStorage.getItem('isReceivingLoggedIn') === 'true'
}