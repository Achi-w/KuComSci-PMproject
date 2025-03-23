document.addEventListener('DOMContentLoaded', function() {
  window.dialogManager = new DialogManager()

  // Populate course dropdown from pre-processed data
  courseOptions.forEach(function(course) {
    $("#courseSelect").append(`<option value="${course.course_id}" data-course="${JSON.stringify(course)}">${course.course_name} (${course.course_id})</option>`);
  });

  // Make course select searchable
  setupSearchableDropdown("#courseSelect");

  // Handle course selection
  $("#courseSelect").on('change', function() {
    const selectedCourseId = $(this).val();
    const courseData = courseOptions.find(course => course.course_id === selectedCourseId);
    $("#courseCode").val(selectedCourseId);
    
    if (selectedCourseId) {
      // Enable section dropdown and load sections for the selected course
      $("#section").prop('disabled', false);
      
      // Update section dropdown with data from the selected option
      updateSectionDropdown(courseData.sections);
    } else {
      // Disable and reset section dropdown if no course is selected
      $("#section").prop('disabled', true).html('<option value="" disabled selected>เลือกหมู่เรียน</option>');
    }
  });

 

  // Initialize date picker for date input
  $('#bookingDate').datepicker({
    format: 'dd/mm/yy',
    changeMonth: true,
    changeYear: true,
    autoclose: true
  });
  
  // Initialize time pickers
  $('#startTime, #endTime').timepicker({
    timeFormat: 'HH:mm:ss',
    interval: 30,
    minTime: '8:00',
    maxTime: '21:00',
    startTime: '08:00',
    dynamic: false,
    dropdown: true,
    scrollbar: true
  });

  $.datepicker.setDefaults({
    dateFormat: 'dd/mm/yy'
  });


  // Prevent user input
  const inputDate = document.getElementById("bookingDate");
  const inputStartTime = document.getElementById("startTime");
  const inputEndTime = document.getElementById("endTime");

  // Date
  inputDate.addEventListener("keydown", function (e) {e.preventDefault();});
  inputDate.addEventListener('paste', function(event) {event.preventDefault(); return false;});
  inputDate.setAttribute('autocomplete', 'off');
  inputDate.addEventListener('focus', function() {inputDate.blur();});

  // Start Time
  inputStartTime.addEventListener("keydown", function (e) {e.preventDefault();});
  inputStartTime.addEventListener('paste', function(event) {event.preventDefault(); return false;});
  inputStartTime.setAttribute('autocomplete', 'off');
  inputStartTime.addEventListener('focus', function() { setTimeout(() => {this.blur(); }, 100);}); 

  // End Time
  inputEndTime.addEventListener("keydown", function (e) {e.preventDefault();});
  inputEndTime.addEventListener('paste', function(event) {event.preventDefault(); return false;});
  inputEndTime.setAttribute('autocomplete', 'off');
  inputEndTime.addEventListener('focus', function() { setTimeout(() => {this.blur(); }, 100);});



  //initialize selected schedule data
  if (bookAction == 'edit') {
    const scheduleData = JSON.parse(decodeURIComponent(window.location.search.split('data=')[1]));
    if (scheduleData) {
      // Select the course first
      const courseOption = $(`#courseSelect option[value="${scheduleData.courseId}"]`);
      if (courseOption.length) {
        // Set the value of the select
        $("#courseSelect").val(scheduleData.courseId).trigger('change');

        // Also set the text in the combobox input and trigger change to update stored value
        const courseText = courseOption.text();
        $(".ui-combobox-input").val(courseText).trigger('change');
        $(".ui-combobox-input").data('selectedValue', courseText);
        
        // Set the hidden course code
        $("#courseCode").val(scheduleData.courseId);
        
        // After sections are populated, select the correct section
        setTimeout(() => {
          $("#section").val(scheduleData.secNumber);
        }, 100);
      }

      if (scheduleData.date) {
        // This function will convert date string to dd/mm/yy format
        const formattedDate = formatDateString(scheduleData.date);
        document.getElementById('bookingDate').value = formattedDate || '';
      }
      
      if (scheduleData.time) {
        const timeMatch = scheduleData.time.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (timeMatch) {
            $("#startTime").timepicker('setTime', timeMatch[1]);
            $("#endTime").timepicker('setTime', timeMatch[2]);
        }
      }
    }
  } 


    
    // Check availability button click handler
    document.getElementById('checkAvailability').addEventListener('click', async function() {
      window.dialogManager.showConfirmDialog('ต้องการจองห้องในวันและเวลานี้ใช่หรือไม่?',  checkAvailableRooms, null);
    });
    
    // Back button click handler
    document.getElementById('backToForm').addEventListener('click', function() {
      document.getElementById('roomBookingForm').style.display = 'block';
      document.getElementById('availableRoomsSection').style.display = 'none';
    });
    
    // Confirm booking button click handler
    document.getElementById('confirmBooking').addEventListener('click', async function() {
      const selectedRoom = document.querySelector('.room-select.room-selected');
      let typeNotice = '';
      if (bookType == 'study_room'){
        typeNotice = 'ห้องเรียน'
      } else{
        typeNotice = 'ห้องสอบ'
      }
      
      if (!selectedRoom) {
        window.dialogManager.showNotificationDialog('กรุณาเลือกห้องก่อนยืนยันการจอง');
        return;
      }

      let dialogMessage = 'คุณตกลงที่จะจอง' + typeNotice + 'หรือไม่';
      if (bookAction == 'edit') {
        dialogMessage = 'คุณตกลงที่จะแก้ไขข้อมูลหรือไม่';
      }

      const roomId = selectedRoom.getAttribute('data-room-id');
      window.dialogManager.showConfirmDialog(
        dialogMessage,
        bookRoom.bind(null,roomId, typeNotice),
        null
      );
      
      
      
    });
    
    // Cancel button click handler
    document.querySelector('.btn-cancel').addEventListener('click', function() {
        window.dialogManager.showConfirmDialog(
            'คุณต้องการยกเลิกการจองใช่หรือไม่?',
            function() {
              // redirect to roomBooking
              window.location.href = '/roomBooking';
            },
            null
          );
    });

});



function formatDateString(dateStr) {
  const months = {
    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
  };
  
  // Extract date parts (assuming format like "FRI 7 MAR 2025")
  const parts = dateStr.trim().split(' ');
  
  if (parts.length >= 3) {
    // Get day, month, year
    const day = parseInt(parts[1], 10);
    const month = months[parts[2].toUpperCase()];
    const year = parseInt(parts[3], 10);
    
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      const date = new Date(year, month, day);
      
      // Format to dd/mm/yy
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth()+1).padStart(2, '0');
      const yyyy = String(date.getFullYear());

      return `${dd}/${mm}/${yyyy}`;
    }
  }
  
  // Return original if parsing fails
  return dateStr;
}

function updateSectionDropdown(sections) {
  // Clear previous options
  const sectionDropdown = $("#section");
  sectionDropdown.html('<option value="" disabled selected>เลือกหมู่เรียน</option>');
  
  if (sections && sections.length > 0) {
    sections.forEach(function(section) {
      sectionDropdown.append(`<option value="${section}">${section}</option>`);
    });
  } else {
    sectionDropdown.append('<option value="" disabled>ไม่พบหมู่เรียน</option>');
  }
}

function populateAvailableRooms(form, availableRooms) {// Populate available rooms
  const availableRoomsSection = document.getElementById('availableRoomsSection');
  const roomList = availableRoomsSection.querySelector('.room-list');

  // Clear existing rooms
  roomList.innerHTML = '';
  // Add sample available rooms
  availableRooms.forEach(room => {
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    roomElement.innerHTML = `
      <div class="room-info">
        <div class="room-name">${room.room_id}</div>
      </div>
      <button class="room-select" data-room-id="${room.room_id}">จองห้อง</button>
    `;
    roomList.appendChild(roomElement);
  });

    // Display no room available
    if (!roomList.childElementCount > 0){
        const roomElement = document.createElement('div');
        roomElement.innerHTML = `ไม่มีห้องว่างในช่วงเวลานี้`;
        roomList.appendChild(roomElement);
    }
  
  // Show available rooms section
  form.style.display = 'none';
  availableRoomsSection.style.display = 'block';
  
  // Add event listeners to room select buttons
  const selectButtons = document.querySelectorAll('.room-select');
  selectButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove selected class from all buttons
      selectButtons.forEach(btn => {
        btn.classList.remove('room-selected');
        btn.textContent = 'จองห้อง';
      });
      
      // Add selected class to clicked button
      this.classList.add('room-selected');

      
      // Enable confirm booking button
      document.getElementById('confirmBooking').disabled = false;
    });
  });
}


async function checkAvailableRooms() {
  const form = document.getElementById('roomBookingForm');
      const courseId = document.getElementById('courseCode').value;
      const section = document.getElementById('section').value;
      const bookingDate = document.getElementById('bookingDate').value;
      const startTime = document.getElementById('startTime').value;
      const endTime = document.getElementById('endTime').value;

      
      // Validate required fields
      if (!courseId || !section || !bookingDate || !startTime || !endTime) {
        window.dialogManager.showNotificationDialog('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      let requestBody;
      if (bookAction == 'add'){
        requestBody = {
          date: bookingDate,
          startTime: startTime,
          endTime: endTime
        }
      } else if (bookAction == 'edit'){
        const scheduleData = JSON.parse(decodeURIComponent(window.location.search.split('data=')[1]));
        const scheduleId = scheduleData.id;
        requestBody = {
          scheduleId: scheduleId,
          date: bookingDate,
          startTime: startTime,
          endTime: endTime
        }
      }

      try {
        // Fetch available rooms from backend
        const response = await fetch('/roomBooking/getAvailableRoom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
  
        if (!response.ok) {
          const errorResponse = await response.json();

          if (errorResponse.error === 'Invalid time') {
            window.dialogManager.showNotificationDialog('กรุณาเลือกวันและเวลาที่ถูกต้อง');
            return;
          } else {
            throw new Error('เกิดข้อผิดพลาดในการค้นหาห้อง');
          }
        }


        const availableRooms = await response.json();
        
        populateAvailableRooms(form, availableRooms);
      
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      window.dialogManager.showNotificationDialog('ไม่สามารถค้นหาห้องได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      }
      
}



async function bookRoom(roomId, typeNotice) {
  // Get form data
  const courseCode = document.getElementById('courseCode').value;
  const section = document.getElementById('section').value;
  const bookingDate = document.getElementById('bookingDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;

  

  if (bookAction == 'add'){
    const requestBody = {
      roomId: roomId,
      courseCode: courseCode,
      bookingDate: bookingDate,
      startTime: startTime,
      endTime: endTime,
      bookType: bookType,
      section: section
    };


    try {

      // add to schedule
      const response = await fetch('/roomBooking/addSchedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('เกิดข้อผิดพลาดในการเพิ่มข้อมูลการจอง เพิ่มลง database');
      }


      const addResult = await response.json();

      if (addResult.response == 1){
        window.dialogManager.showNotificationDialog(`ขออภัย ไม่สามารถจอง${typeNotice}ได้เนื่องจากเวลานี้ถูกจองไปแล้ว`);
        return;
      } else if (addResult.response == 0){
        window.dialogManager.showNotificationDialog(
          `ข้อมูลการจอง${typeNotice}ได้ถูกเพิ่มแล้ว`,
          function() {
            document.location.href = '/roomBooking';
          }
        );
      } else {
        throw new Error('เกิดข้อผิดพลาดในการเพิ่มข้อมูลการจอง');
      }

    } catch (error) {
      console.error('Error adding schedule:', error);
      window.dialogManager.showNotificationDialog('เกิดข้อผิดพลาดในการจองห้อง กรุณาลองใหม่อีกครั้ง');
      return;
    }
  }
  else if (bookAction == 'edit'){
    const scheduleData = JSON.parse(decodeURIComponent(window.location.search.split('data=')[1]));
    const requestBody = {
      scheduleId: scheduleData.id,
      roomId: roomId,
      courseCode: courseCode,
      bookingDate: bookingDate,
      startTime: startTime,
      endTime: endTime,
      section: section
    };


    try {
      // add to schedule
      const response = await fetch('/roomBooking/editSchedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('เกิดข้อผิดพลาดในการเพิ่มข้อมูลการจอง เพิ่มลง database');
      }

      const addResult = await response.json();
      if (addResult.response == 1){
        window.dialogManager.showNotificationDialog(`ขออภัย ไม่สามารถจอง${typeNotice}ได้เนื่องจากเวลานี้ถูกจองไปแล้ว`);
        return;
        } else if (addResult.response == 0){
          window.dialogManager.showNotificationDialog(
            `แก้ไขข้อมูลการจอง${typeNotice}สำเร็จแล้ว`,
            function() {
              document.location.href = '/roomBooking';
            }
          );
        } else {
          throw new Error('เกิดข้อผิดพลาดในการแก้ไขข้อมูลการจอง');
        }

      } catch (error) {
        console.error('Error adding schedule:', error);
        window.dialogManager.showNotificationDialog('เกิดข้อผิดพลาดในการแก้ไขข้อมูลการจอง กรุณาลองใหม่อีกครั้ง');
        return;
      }
  }
}

function setupSearchableDropdown(selectElement) {
  const select = $(selectElement);
  const wrapper = $("<div>").addClass("ui-combobox");
  const input = $("<input>")
    .addClass("form-control ui-combobox-input")
    .attr("placeholder", "เลือกรายวิชา")
    .insertAfter(select);
  
  console.log(input);
  console.log(input.val());
  // Variables to track dropdown and editing state
  let isDropdownOpen = false;
  let isEditing = false;
  
  // Hide the original select
  select.hide();
  
  // Create and position wrapper
  select.wrap(wrapper);
  
  // Get initially selected value if any
  const initialOption = select.find("option:selected");
  if (initialOption.val()) {
    input.val(initialOption.text());
    // Store the selected value for reference
    input.data('selectedValue', initialOption.text());
  } else {
    input.data('selectedValue', '');
  }
  
  // Create dropdown element that will stay in the DOM
  const dropdownMenu = $("<div>")
    .addClass("ui-combobox-dropdown")
    .css({
      "position": "absolute",
      "z-index": "1000",
      "background": "white",
      "border": "1px solid #ccc",
      "max-height": "300px",
      "overflow-y": "auto",
      "display": "none"
    })
    .insertAfter(input);
  
  // Function to position dropdown
  function positionDropdown() {
    dropdownMenu.css({
      "width": input.outerWidth(),
      "top": input.position().top + input.outerHeight(),
      "left": input.position().left
    });
  }
  
  // Function to populate dropdown based on search term
  function populateDropdown(searchTerm) {
    dropdownMenu.empty();
    
    const matcher = new RegExp($.ui.autocomplete.escapeRegex(searchTerm), "i");
    let matchFound = false;
    
    select.children("option").each(function() {
      if (this.value && (!searchTerm || matcher.test($(this).text()))) {
        const optionText = $(this).text();
        const optionValue = $(this).val();
        
        const option = $("<div>")
          .addClass("ui-combobox-item")
          .css({
            "padding": "8px 12px",
            "cursor": "pointer"
          })
          .text(optionText)
          .hover(
            function() { $(this).css("background-color", "#f0f0f0"); },
            function() { $(this).css("background-color", ""); }
          )
          .on("click", function() {
            // Update the input value
            input.val(optionText);
            
            // Store the selected value
            input.data('selectedValue', optionText);
            
            // Update the select value
            select.val(optionValue);
            select.trigger("change");
            
            // Exit edit mode and hide dropdown
            isEditing = false;
            closeDropdown();
            
            // Blur the input
            input.blur();
            
          });
        
        dropdownMenu.append(option);
        matchFound = true;
      }
    });
    
    // If no matches found, show a message
    if (!matchFound && searchTerm) {
      const noMatch = $("<div>")
        .addClass("ui-combobox-no-match")
        .css({
          "padding": "8px 12px",
          "color": "#999",
          "font-style": "italic"
        })
        .text("ไม่พบรายวิชาที่ตรงกับคําค้นหา");
      
      dropdownMenu.append(noMatch);
    }
    
    // Show dropdown if it's supposed to be open
    if (isDropdownOpen) {
      positionDropdown();
      dropdownMenu.show();
    }
  }
  
  // Function to open dropdown and enter edit mode
  function openDropdown() {
    isDropdownOpen = true;
    isEditing = true;
    
    // Clear the input field but keep the value as placeholder
    if (input.val()) {
      input.attr('placeholder', input.val());
      input.val('');
    }
    
    positionDropdown();
    dropdownMenu.show();
    populateDropdown('');
  }
  
  // Function to close dropdown
  function closeDropdown() {
    isDropdownOpen = false;
    dropdownMenu.hide();
    
    // If we're still in edit mode, revert to previous selection
    if (isEditing) {
      restorePreviousSelection();
    }
  }
  
  // Function to restore previous selection
  function restorePreviousSelection() {
    // If we have a previously selected value, restore it
    if (input.data('selectedValue')) {
      input.val(input.data('selectedValue'));
    } else {
      input.val('');
    }
    isEditing = false;
  }
  
  // Handle input changes for searching
  input.on("input", function() {
    if (!isDropdownOpen) {
      openDropdown();
    } else {
      populateDropdown($(this).val());
    }
  });
  
  // Handle focus on input
  input.on("focus", function() {
    if (!isEditing) {
      openDropdown();
    }
  });
  
  // Handle click on input - start editing and show all options
  input.on("click", function(e) {
    e.stopPropagation();
    if (!isEditing) {
      openDropdown();
    }
  });
  
  // When input loses focus
  input.on("blur", function() {
    // Don't restore selection immediately as it might be a click on the dropdown
    setTimeout(function() {
      // If dropdown is now closed and we were still editing, restore selection
      if (!isDropdownOpen && isEditing) {
        restorePreviousSelection();
      }
    }, 200);
  });
  
  // Close dropdown when clicking outside
  $(document).on("click", function(e) {
    if (!$(e.target).is(input) && 
        !$(e.target).is(dropdownMenu) && 
        !dropdownMenu.has(e.target).length && 
        !$(e.target).is('.ui-combobox-toggle')) {
      closeDropdown();
    }
  });
  
  // Handle keyboard navigation
  input.on("keydown", function(e) {
    // Escape key
    if (e.keyCode === 27) {
      closeDropdown();
    }
    // Enter key
    else if (e.keyCode === 13 || e.keyCode === 9) {
      e.preventDefault();
      // Select the first matching item if available
      const firstItem = dropdownMenu.find(".ui-combobox-item").first();
      if (firstItem.length) {
        firstItem.click();
      } else {
        // No matches, revert to previous selection
        closeDropdown();
      }
    }
  });
  
  // Handle window resize to reposition dropdown
  $(window).resize(function() {
    if (isDropdownOpen) {
      positionDropdown();
    }
  });
}