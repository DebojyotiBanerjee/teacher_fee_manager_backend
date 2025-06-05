const processPaymentDetails = function(next) {
    // Generate payment ID
    if (!this.paymentId) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.paymentId = `PAY${year}${month}${random}`;
    }
    
    // Generate receipt number if payment is completed
    if (this.paymentStatus === 'Completed' && !this.receiptNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      this.receiptNumber = `REC${year}${random}`;
      this.receiptIssued = true;
    }
    
    // Set paid date if payment is completed
    if (this.paymentStatus === 'Completed' && !this.paidDate) {
      this.paidDate = new Date();
    }
    
    // Calculate late payment
    if (this.dueDate && this.paidDate) {
      const diffTime = this.paidDate - this.dueDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        this.isLatePayment = true;
        this.daysLate = diffDays;
      }
    }
    
    next();
};

module.exports = { processPaymentDetails };