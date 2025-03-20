/**
 * Dialog functionality for confirmation and notification dialogs
 */
class DialogManager {
    constructor() {
      this.container = document.getElementById('dialogContainer');
      this.message = document.getElementById('dialogMessage');
      this.actionsContainer = document.getElementById('dialogActions');
      
      // Create overlay for main form
      this.overlay = document.createElement('div');
      this.overlay.className = 'form-overlay';
    }
    
    /**
     * Shows a confirmation dialog with custom message and callback functions
     * @param {string} message - The message to display
     * @param {Function} confirmCallback - Function to execute on confirm
     * @param {Function} cancelCallback - Function to execute on cancel
     * @param {string} confirmText - Text for confirm button (default: 'ยืนยัน')
     * @param {string} cancelText - Text for cancel button (default: 'ยกเลิก')
     */
    showConfirmDialog(message, confirmCallback, cancelCallback, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก') {
      // Set message
      this.message.textContent = message;
      
      // Clear previous buttons
      this.actionsContainer.innerHTML = '';
      
      // Create cancel button
      const cancelButton = document.createElement('button');
      cancelButton.className = 'dialog-btn dialog-btn-cancel';
      cancelButton.textContent = cancelText;
      cancelButton.addEventListener('click', () => {
        this.hideDialog();
        if (cancelCallback) cancelCallback();
      });
      
      // Create confirm button
      const confirmButton = document.createElement('button');
      confirmButton.className = 'dialog-btn dialog-btn-confirm';
      confirmButton.textContent = confirmText;
      confirmButton.addEventListener('click', () => {
        this.hideDialog();
        if (confirmCallback) {
            confirmCallback();
        }
        else if (cancelCallback) {
            cancelCallback()
        };
      });
      
      // Add buttons to dialog
      this.actionsContainer.appendChild(cancelButton);
      this.actionsContainer.appendChild(confirmButton);
      
      // Show dialog
      this.showDialogWithOverlay();
    }
    
    /**
     * Shows a notification dialog with only a confirm button
     * @param {string} message - The message to display
     * @param {Function} callback - Function to execute on confirm
     * @param {string} buttonText - Text for confirm button (default: 'ยืนยัน')
     */
    showNotificationDialog(message, callback, buttonText = 'ยืนยัน') {
      // Set message
      this.message.textContent = message;
      
      // Clear previous buttons
      this.actionsContainer.innerHTML = '';
      
      // Create confirm button
      const confirmButton = document.createElement('button');
      confirmButton.className = 'dialog-btn dialog-btn-confirm';
      confirmButton.textContent = buttonText;
      confirmButton.addEventListener('click', () => {
        this.hideDialog();
        if (callback) callback();
      });
      
      // Add button to dialog
      this.actionsContainer.appendChild(confirmButton);
      
      // Show dialog
      this.showDialogWithOverlay();
    }
    
    /**
     * Shows the dialog and adds overlay to main form
     */
    showDialogWithOverlay() {
      // Add overlay to booking form
      const bookingForm = document.querySelector('.booking-form-card');
      if (bookingForm) {
        bookingForm.appendChild(this.overlay);
      }
      
      // Show dialog
      this.container.style.display = 'block';
    }
    
    /**
     * Hides the dialog and removes the overlay
     */
    hideDialog() {
      // Remove overlay
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      
      // Hide dialog
      this.container.style.display = 'none';
    }
  }
  
