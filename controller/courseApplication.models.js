const Course = require('../models/course.models');
const courseApplication = require('../models/courseApplication.models');
const DetailStudent = require('../models/detailStudent.model');
const BatchEnrollment = require('../models/batchEnrollment.models');
const { sanitizeRequest } = require('../utils/sanitizer');
const { 
    handleError,
    sendSuccessResponse,
    logControllerAction,
    canAccessCourse,
    isOwner    
} = require('../utils/controllerUtils');


exports.viewCourseApplication = async (req, res) => {
    logControllerAction('View Course Application', req.user, { params: req.params });
    try {        
        // Check if user can access course (for teachers)
        if (req.user.role === 'teacher') {
            const hasAccess = await canAccessCourse(req, DetailStudent, Course);
            if (!hasAccess) {
                return handleError({
                    name: 'Forbidden',
                    message: 'You do not have permission to access this course'
                }, res, 'Access denied');
            }
        }

        const { applicationId } = req.params;
        
        if (!applicationId) {
            return handleError({
                name: 'ValidationError',
                message: 'Application ID is required'
            }, res, 'Application ID is required');
        }

        // Find the course application with populated data
        const application = await courseApplication.findById(applicationId)
            .populate({
                path: 'student',
                select: 'name email phone'
            })
            .populate({
                path: 'course',
                select: 'courseName description duration fee'
            })
            .populate({
                path: 'batch',
                select: 'batchName startDate days time mode maxStrength currentStrength'
            });

        if (!application) {
            return handleError({
                name: 'NotFound',
                message: 'Course application not found'
            }, res, 'Course application not found');
        }

        // Check if student is enrolled in the batch
        const enrollment = await BatchEnrollment.findOne({
            batch: application.batch._id,
            student: application.student._id
        });

        // Get student details if available
        const studentDetails = await DetailStudent.findOne({ user: application.student._id })
            .select('gender education guardian address dob');

        const responseData = {
            application: {
                id: application._id,
                appliedAt: application.appliedAt,
                createdAt: application.createdAt,
                updatedAt: application.updatedAt
            },
            student: {
                id: application.student._id,
                name: application.student.name,
                email: application.student.email,
                phone: application.student.phone,
                details: studentDetails ? {
                    gender: studentDetails.gender,
                    education: studentDetails.education,
                    guardian: studentDetails.guardian,
                    address: studentDetails.address,
                    dob: studentDetails.dob
                } : null
            },
            course: {
                id: application.course._id,
                name: application.course.courseName,
                description: application.course.description,
                duration: application.course.duration,
                fee: application.course.fee
            },
            batch: {
                id: application.batch._id,
                name: application.batch.batchName,
                startDate: application.batch.startDate,
                days: application.batch.days,
                time: application.batch.time,
                mode: application.batch.mode,
                maxStrength: application.batch.maxStrength,
                currentStrength: application.batch.currentStrength
            },
            enrollmentStatus: {
                isEnrolled: !!enrollment,
                enrolledAt: enrollment ? enrollment.enrolledAt : null
            }
        };
        
        return sendSuccessResponse(res, responseData, 'Course application details retrieved successfully');
    } catch (err) {
        handleError(err, res, 'Failed to view course application');
    }
};


exports.viewCourseApplicationsByCourse = async (req, res) => {
    logControllerAction('View Course Applications By Course', req.user, { params: req.params });
    try {        
        // Check if user can access course (for teachers)
        if (req.user.role === 'teacher') {
            const hasAccess = await canAccessCourse(req, DetailStudent, Course);
            if (!hasAccess) {
                return handleError({
                    name: 'Forbidden',
                    message: 'You do not have permission to access this course'
                }, res, 'Access denied');
            }
        }

        const { courseId } = req.params;
        
        if (!courseId) {
            return handleError({
                name: 'ValidationError',
                message: 'Course ID is required'
            }, res, 'Course ID is required');
        }

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return handleError({
                name: 'NotFound',
                message: 'Course not found'
            }, res, 'Course not found');
        }

        // Find all course applications for this course with populated data
        const applications = await courseApplication.find({ course: courseId })
            .populate({
                path: 'student',
                select: 'name email phone'
            })
            .populate({
                path: 'course',
                select: 'courseName description duration fee'
            })
            .populate({
                path: 'batch',
                select: 'batchName startDate days time mode maxStrength currentStrength'
            })
            .sort({ createdAt: -1 });

        if (!applications || applications.length === 0) {
            return sendSuccessResponse(res, {
                course: {
                    id: course._id,
                    name: course.courseName,
                    description: course.description,
                    duration: course.duration,
                    fee: course.fee
                },
                applications: [],
                totalApplications: 0
            }, 'No applications found for this course');
        }

        // Get enrollment status for all students
        const studentIds = applications.map(app => app.student._id);
        const batchIds = applications.map(app => app.batch._id);
        
        const enrollments = await BatchEnrollment.find({
            student: { $in: studentIds },
            batch: { $in: batchIds }
        });

        // Create enrollment lookup map
        const enrollmentMap = new Map();
        enrollments.forEach(enrollment => {
            const key = `${enrollment.student}_${enrollment.batch}`;
            enrollmentMap.set(key, enrollment);
        });

        // Get student details for all students
        const studentDetails = await DetailStudent.find({ user: { $in: studentIds } })
            .select('user gender education guardian address dob');

        const studentDetailsMap = new Map();
        studentDetails.forEach(detail => {
            studentDetailsMap.set(detail.user.toString(), detail);
        });

        const applicationsData = applications.map(application => {
            const enrollmentKey = `${application.student._id}_${application.batch._id}`;
            const enrollment = enrollmentMap.get(enrollmentKey);
            const studentDetail = studentDetailsMap.get(application.student._id.toString());

            return {
                application: {
                    id: application._id,
                    appliedAt: application.appliedAt,
                    createdAt: application.createdAt,
                    updatedAt: application.updatedAt
                },
                student: {
                    id: application.student._id,
                    name: application.student.name,
                    email: application.student.email,
                    phone: application.student.phone,
                    details: studentDetail ? {
                        gender: studentDetail.gender,
                        education: studentDetail.education,
                        guardian: studentDetail.guardian,
                        address: studentDetail.address,
                        dob: studentDetail.dob
                    } : null
                },
                batch: {
                    id: application.batch._id,
                    name: application.batch.batchName,
                    startDate: application.batch.startDate,
                    days: application.batch.days,
                    time: application.batch.time,
                    mode: application.batch.mode,
                    maxStrength: application.batch.maxStrength,
                    currentStrength: application.batch.currentStrength
                },
                enrollmentStatus: {
                    isEnrolled: !!enrollment,
                    enrolledAt: enrollment ? enrollment.enrolledAt : null
                }
            };
        });

        const responseData = {
            course: {
                id: course._id,
                name: course.courseName,
                description: course.description,
                duration: course.duration,
                fee: course.fee
            },
            applications: applicationsData,
            totalApplications: applicationsData.length,
            enrollmentStats: {
                totalEnrolled: applicationsData.filter(app => app.enrollmentStatus.isEnrolled).length,
                totalNotEnrolled: applicationsData.filter(app => !app.enrollmentStatus.isEnrolled).length
            }
        };
        
        return sendSuccessResponse(res, responseData, 'Course applications retrieved successfully');
    } catch (err) {
        handleError(err, res, 'Failed to view course applications');
    }
};











