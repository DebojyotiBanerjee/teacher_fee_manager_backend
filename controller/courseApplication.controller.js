const Course = require('../models/course.models');
const CourseApplication = require('../models/courseApplication.models');
const DetailTeacher = require('../models/detailTeacher.models');
const Batch = require('../models/batch.models');
const { 
    handleError,
    sendSuccessResponse,
    logControllerAction,
    canAccessCourse,    
} = require('../utils/controllerUtils');


exports.viewCourseApplication = async (req, res) => {
    logControllerAction('View Course Application', req.user, { params: req.params });
    
    // Check if the user is a teacher
    if (req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Only teachers can view course applications.' }, res, 'Only teachers can view course applications.');
    }
    
    // Check if the user has a complete profile
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }
    
    try {
        // First get all courses created by this teacher
        const teacherCourses = await Course.find({ 
            teacher: req.user._id, 
            isDeleted: false 
        }).select('_id title');

        if (!teacherCourses || teacherCourses.length === 0) {
            return sendSuccessResponse(res, {
                applications: []
            }, 'No courses found for this teacher');
        }

        const courseIds = teacherCourses.map(course => course._id);

        // Find all course applications for the teacher's courses
        const courseApplications = await CourseApplication.find({
            course: { $in: courseIds }
        })
            .populate({
                path: 'course',
                select: 'title'
            })
            .populate({
                path: 'student',
                select: 'fullname'
            })
            .sort({ appliedAt: -1 });

        // Get batches for all courses
        const batches = await Batch.find({
            course: { $in: courseIds },
            isDeleted: false
        }).select('batchName course days time maxStrength currentStrength');

        // Create a map of courseId to batches
        const courseBatchesMap = {};
        batches.forEach(batch => {
            if (!courseBatchesMap[batch.course]) {
                courseBatchesMap[batch.course] = [];
            }
            courseBatchesMap[batch.course].push({                
                batchName: batch.batchName,
                days: batch.days,
                time: batch.time,                
                maxStrength: batch.maxStrength,
                currentStrength: batch.currentStrength
            });
        });

        // Transform the data using enrollStudent virtual field
        const transformedApplications = courseApplications.map(app => {
            // Get the enrollStudent virtual field
            const enrollStudentData = app.enrollStudent;
            
            return {
                enrollmentId: enrollStudentData.enrollmentId,
                studentName: app.student.fullname,
                appliedAt: enrollStudentData.appliedAt,
                courseName: app.course.title,
                status: enrollStudentData.status,
                batches: courseBatchesMap[app.course._id] || []
            };
        });

        return sendSuccessResponse(res, {
            applications: transformedApplications,
            totalStudents: transformedApplications.length
        }, 'Course applications fetched successfully');

    } catch (err) {
        return handleError(err, res, 'Failed to fetch course applications');
    }
};


