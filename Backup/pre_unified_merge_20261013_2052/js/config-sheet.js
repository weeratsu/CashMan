/* config-sheet.js - CashMan Google Sheet connection (LOCAL ONLY - in .gitignore, never push).
   While endpoint is empty, CashMan stays on browser localStorage (exactly as before).
   After deploying scripts/Code.gs, paste the /exec URL into endpoint. Tokens must equal Code.gs. */
window.CM_SHEET_CFG = {
  endpoint:  'https://script.google.com/macros/s/AKfycbzx_ZUG_kxger7LnFnmV-kCUJUkcGv0lQgH6yi1Ssz2SoFJcPxIpUiPJr_qPFUf6xf3/exec', // SYNC PAUSED Oct 7 20:30 (data-loss incident). URL was: https://script.google.com/macros/s/AKfycbzx_ZUG_kxger7LnFnmV-kCUJUkcGv0lQgH6yi1Ssz2SoFJcPxIpUiPJr_qPFUf6xf3/exec,
  writeToken:'cm_w_9PmnP5eLy6-LMVb2NxLmT04UFfYhid5Y',
  readToken: 'cm_r_uyqABAKF9Mzh576oQd4yOO2TIwwiJtv2'
};
