const e = require('express');
const Schedule = require('../models/RoomSchedule')


class StudyBookController{
log
    constructor(res){
        this.res = res;
        this.schedule = new Schedule;
    }
    async renderSchedule(req,res, cond){
        const user = req.session.user;
        if (!user) {
            res.redirect('/index.html');
            return;
        }

        const user_id = user.USER_ID;
        const user_full_name = user.USER_Name + ' ' + user.USER_Surname;
        const role = this.getRoleLabel(user.USER_Role.toLowerCase());
        
        let scheduleList;
        const isTeacher = (user.USER_Role.toLowerCase() == 'teacher');
        const isAdmin = (user.USER_Role.toLowerCase() == 'admin');
        
        if (cond == 0) {
            scheduleList = await this.schedule.getRoomSchedule(user_id, this.convertBooktypeLabel('study_room'), isTeacher, isAdmin);
            res.render('roomSchedule', {scheduleList: scheduleList, bookType: 'study_room', label:'ห้องเรียน', isTeacher: isTeacher, user_full_name: user_full_name, role: role, isAdmin: isAdmin});
        } else if (cond == 1) {
            scheduleList = await this.schedule.getRoomSchedule(user_id, this.convertBooktypeLabel('midterm_room'), isTeacher, isAdmin);
            res.render('roomSchedule', {scheduleList: scheduleList, bookType: 'midterm_room', label:'ห้องสอบ', isTeacher: isTeacher, user_full_name: user_full_name, role: role, isAdmin: isAdmin});
        } else if (cond == 2) {
            scheduleList = await this.schedule.getRoomSchedule(user_id, this.convertBooktypeLabel('final_room'), isTeacher, isAdmin);
            res.render('roomSchedule', {scheduleList: scheduleList, bookType: 'final_room', label: 'ห้องสอบ', isTeacher: isTeacher, user_full_name: user_full_name, role: role, isAdmin: isAdmin});
        }
    }

    async renderForm(req, res, cond, action){
        const user = req.session.user;
        if (!user) {
            res.redirect('/index.html');
            return;
        }
        const user_id = user.USER_ID;
        const user_full_name = user.USER_Name + ' ' + user.USER_Surname;
        
        const isTeacher = (user.USER_Role.toLowerCase() == 'teacher');
        const isAdmin = (user.USER_Role.toLowerCase() == 'admin');

        if (!isTeacher && !isAdmin) {
            res.redirect('/roomBooking/studyRoom');
        }

        const role = this.getRoleLabel(user.USER_Role.toLowerCase());
        
        let courses;
        if (cond == 0) {
            courses = await this.schedule.getCourseList(user_id, isTeacher, isAdmin);
            res.render('roomBookForm', {bookType: 'study_room', bookAction: action, label: 'ห้องเรียน', courses: courses, user_full_name: user_full_name, isTeacher: isTeacher, role: role});
        } else if (cond == 1) {
            courses = await this.schedule.getCourseList(user_id, isTeacher, isAdmin);
            res.render('roomBookForm', {bookType: 'midterm_room', bookAction: action, label: 'ห้องสอบ', courses: courses, user_full_name: user_full_name, isTeacher: isTeacher, role: role})
        } else if (cond == 2) {
            courses = await this.schedule.getCourseList(user_id, isTeacher, isAdmin);
            res.render('roomBookForm', {bookType: 'final_room', bookAction: action, label: 'ห้องสอบ', courses: courses,  user_full_name: user_full_name, isTeacher: isTeacher, role: role})
        }
    }

    
    async handleGetAvailableRoom(req, res){
        // Check if body exists
        if (!req.body) {
            return res.status(400).json({ 
            error: 'No request body',
            message: 'Request body is missing or empty' 
            });
        }
        
        const {
            scheduleId,
            date, 
            startTime, 
            endTime
        } = req.body

        const user_role = req.session.user.USER_Role;
        const isAdmin = (user_role.toLowerCase() == 'admin');

        const timeValidity = this.checkTime(date, startTime, endTime, isAdmin)
        if (!timeValidity) {
            return res.status(400).json({ 
            error: 'Invalid time',
            message: 'Please enter a valid time' 
            });
        }
        const availableRooms = await this.schedule.getAvailableRoom(date, startTime, endTime, scheduleId)
        res.status(201).json(availableRooms);
        
    }

    async handleAddSchedule(req, res){

        // Check if body exists
        if (!req.body) {
            return res.status(400).json({ 
            error: 'No request body',
            message: 'Request body is missing or empty' 
            });
        }
        const {roomId, 
            courseCode, 
            bookingDate, 
            startTime, 
            endTime,
            bookType,
            section
        } = req.body;



        const response = await this.schedule.addSchedule(roomId, courseCode, bookingDate, startTime, endTime, this.convertBooktypeLabel(bookType), section)
        res.status(201).json({ response: response });
        
    }

    async handleEditSchedule(req, res){

        // Check if body exists
        if (!req.body) {
            return res.status(400).json({ 
            error: 'No request body',
            message: 'Request body is missing or empty' 
            });
        }
        const {
            scheduleId,
            roomId, 
            courseCode, 
            bookingDate, 
            startTime, 
            endTime,
            section
        } = req.body;


        const response = await this.schedule.editSchedule(scheduleId, roomId, courseCode, bookingDate, startTime, endTime, section)
        res.status(201).json({ response: response });
        
    }

    checkTime(date, start_time, end_time, isAdmin){
        const now = new Date();
        const [day, month, year] = date.split("/");
        const [start_hours, start_minutes, start_seconds] = start_time.split(":");
        const startDateTime = new Date(year, month - 1, day, start_hours, start_minutes, start_seconds);

        const [end_hours, end_minutes, end_seconds] = end_time.split(":");
        const endDateTime = new Date(year, month - 1, day, end_hours, end_minutes, end_seconds);

        if (!this.validateDate(date) || !this.validateTime(start_time) || !this.validateTime(end_time)) {
            return false;
        }

        if (startDateTime < now) {
            return false;
        }

        if (endDateTime <= startDateTime) {
            return false;
        }

        if (isAdmin){
            const reserve_date = new Date(year, month - 1, day)
            const currentDay = now.getDay();
            const diff = currentDay === 0 ? -6 : 1 - currentDay;

            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() + diff);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            if (reserve_date > weekEnd){
                return false;
            }

        }

        return true;
    }

    convertBooktypeLabel(bookType) {
        switch (bookType) {
            case 'study_room':
                return "Lecture";
            case 'midterm_room':
                return "Midterm";
            case 'final_room':
                return "Final";
            default:
                return "";
        }
    }

    getRoleLabel(role) {
        switch (role) {
            case 'student':
                return "Nisit";
            case 'teacher':
                return "Professor";
            case 'admin':
                return "Admin";
            default:
                return "Nisit";
        }
    }

    validateDate(dateString) {
        // Check if the format matches dd/mm/yyyy pattern
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!regex.test(dateString)) {
          return false;
        }
      
        // Extract day, month, and year
        const parts = dateString.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
      
        // Check year range (adjust as needed)
        if (year < 2000 || year > 2100) {
          return false;
        }
      
        // Check month range
        if (month < 1 || month > 12) {
          return false;
        }
      
        // Check day range based on month
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        // Adjust February for leap years
        if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) {
          daysInMonth[1] = 29;
        }
      
        return day > 0 && day <= daysInMonth[month - 1];
      }


      validateTime(timeString) {
        // Check if the format matches HH:mm:ss pattern
        const regex = /^(\d{2}):(\d{2}):(\d{2})$/;
        if (!regex.test(timeString)) {
          return false;
        }
      
        // Extract hours, minutes, and seconds
        const parts = timeString.split(':');
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
      
        // Check hours range (8-20)
        if (hours < 8 || hours > 21) {
          return false;
        }
      
        // Check minutes range (0 and 30 only)
        if (minutes !== 0 && minutes !== 30) {
          return false;
        }
      
        // Check seconds range (0 only)
        if (seconds !== 0) {
          return false;
        }

        if (hours === 21 && minutes !== 0) {
            return false;
        }
      
        return true;
      }
}

module.exports = StudyBookController;
