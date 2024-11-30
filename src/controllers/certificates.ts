import { CertificateModel } from "@/models/Certificate";
import { CourseModel } from "@/models/Course";
import { UserModel } from "@/models/User";
import { Request, Response } from "express";
import { getCompletedCoursesByUserId } from "./progress";
import { ObjectId } from "bson";

export const getCertificate = async (req: Request, res: Response) => {
  const { certificateId } = req.params;

  try {
    if (!certificateId) {
      return res.status(400).send({ error: { message: "Missing certificateId" } });
    }

    const certificate = await CertificateModel.findOne({ _id: certificateId });
    if (certificate) {
      return res.status(200).send(certificate);
    }
  } catch (e) {
    console.error(`[ERROR][getCertificate] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Certificate not found",
    },
  });
};

export const generateCertificate = async (req: Request, res: Response) => {
  const { courseId } = req.body;

  const userId = res.locals?.populatedUser?._id;

  try {
    if (!courseId) {
      return res.status(400).send({ error: { message: "Missing courseId" } });
    }

    const courseData = await CourseModel.findOne({ _id: courseId });
    const userData = await UserModel.findOne({ _id: userId });

    if (!userData || !courseData) {
      return res.status(400).send({
        error: {
          message: "User or Course not found",
        },
      });
    }

    const userCompletedCourses = await getCompletedCoursesByUserId(userId.toString());
    const isUserElegibleForCertificate = userCompletedCourses.some(
      (i) => i.courseId.toString() === courseId.toString(),
    );

    if (!isUserElegibleForCertificate) {
      return res.status(400).send({
        error: {
          message: "User not elegible for certificate",
        },
      });
    }

    const newCertificate = await CertificateModel.create({
      courseTitle: courseData.title,
      userName: userData.name,
      userId: userId,
      courseId: courseId,
    });

    if (newCertificate) {
      return res.status(200).send(newCertificate);
    }
  } catch (e) {
    console.error(`[ERROR][generateCertificate] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Error while creating certificate",
    },
  });
};

export const getCertificates = async (req: Request, res: Response) => {
  const { courseId, userId } = req.query;

  try {
    if (!courseId && !userId) {
      return res.status(400).send({ error: { message: "Missing courseId or userId" } });
    }

    let query = {};
    if (courseId) query = { courseId: new ObjectId(courseId as string) };
    if (userId) query = { ...query, userId: new ObjectId(userId as string) };

    const certificates = await CertificateModel.find(query);
    if (certificates.length > 0) {
      return res.status(200).send(certificates);
    } else {
      return res.status(404).send({
        error: {
          message: "No certificates found for user/course",
        },
      });
    }
  } catch (e) {
    console.error(`[ERROR][getCertificates] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Certificates not found",
    },
  });
};
