(() => {
  if (window.PDLeadForms?.initContactPageForm) {
    window.PDLeadForms.initContactPageForm();
    return;
  }
  console.warn('PDLeadForms not loaded; contact form inactive.');
})();
