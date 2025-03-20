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

     
        let scheduleList;
        const isTeacher = (user.USER_Role.toLowerCase() == 'teacher');
        if (cond == 0) {
            scheduleList = await this.schedule.getRoomSchedule(user_id, this.convertBooktypeLabel('study_room'), isTeacher);
            res.render('roomSchedule', {scheduleList: scheduleList, bookType: 'study_room', label:'ห้องเรียน', isTeacher: isTeacher, user_full_name: user_full_name});
        } else if (cond == 1) {
            scheduleList = await this.schedule.getRoomSchedule(user_id, this.convertBooktypeLabel('midterm_room'), isTeacher);
            res.render('roomSchedule', {scheduleList: scheduleList, bookType: 'midterm_room', label:'ห้องสอบ', isTeacher: isTeacher, user_full_name: user_full_name});
        } else if (cond == 2) {
            scheduleList = await this.schedule.getRoomSchedule(user_id, this.convertBooktypeLabel('final_room'), isTeacher);
            res.render('roomSchedule', {scheduleList: scheduleList, bookType: 'final_room', label: 'ห้องสอบ', isTeacher: isTeacher, user_full_name: user_full_name});
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
        if (!isTeacher) {
            res.redirect('/roomBooking/studyRoom');
        }
        
        let courses;
        if (cond == 0) {
            courses = await this.schedule.getCourseList(user_id);
            res.render('roomBookForm', {bookType: 'study_room', bookAction: action, label: 'ห้องเรียน', courses: courses, user_full_name: user_full_name});
        } else if (cond == 1) {
            courses = await this.schedule.getCourseList(user_id);
            res.render('roomBookForm', {bookType: 'midterm_room', bookAction: action, label: 'ห้องสอบ', courses: courses, user_full_name: user_full_name})
        } else if (cond == 2) {
            courses = await this.schedule.getCourseList(user_id);
            res.render('roomBookForm', {bookType: 'final_room', bookAction: action, label: 'ห้องสอบ', courses: courses,  user_full_name: user_full_name})
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
        const timeValidity = this.checkTime(date, startTime, endTime)
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

    checkTime(date, start_time, end_time){
        const now = new Date();
        const [day, month, year] = date.split("/");
        const [start_hours, start_minutes, start_seconds] = start_time.split(":");
        const startDateTime = new Date(year, month - 1, day, start_hours, start_minutes, start_seconds);

        const [end_hours, end_minutes, end_seconds] = end_time.split(":");
        const endDateTime = new Date(year, month - 1, day, end_hours, end_minutes, end_seconds);

        if (startDateTime < now) {
            return false;
        }

        if (endDateTime <= startDateTime) {
            return false;
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
}

module.exports = StudyBookController;
