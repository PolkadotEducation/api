import { CertificateModel } from "@/models/Certificate";
import { CourseModel } from "@/models/Course";
import { UserModel } from "@/models/User";
import { Request, Response } from "express";
import { getCompletedCoursesByUserId } from "./progress";

export const getCertificate = async (req: Request, res: Response) => {
  const { certificateId } = req.query;

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
