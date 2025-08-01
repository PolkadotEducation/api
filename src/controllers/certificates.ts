import { CertificateModel } from "@/models/Certificate";
import { CourseModel } from "@/models/Course";
import { UserModel } from "@/models/User";
import { Request, Response } from "express";
import { getCompletedCoursesByUserId } from "./progress";
import { ObjectId } from "mongodb";
import { signMintPayload } from "@/helpers/web3";
import { MintSpecs } from "@/types/Mint";
import { env } from "@/environment";
import { finishOneCourse } from "@/helpers/achievements";
import { ProgressModel } from "@/models/Progress";

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

    const certificateAlreadyGenerated = await CertificateModel.findOne({ userId, courseId });
    if (certificateAlreadyGenerated) {
      return res.status(400).send({
        error: {
          message: "Certificate for this course already generated",
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

    const itemId = (await CertificateModel.countDocuments({ "mintSpecs.collectionId": env.MINT_COLLECTION_ID })) + 1;

    const newCertificate = await CertificateModel.create({
      courseTitle: courseData.title,
      userName: userData.name,
      userId: userId,
      courseId: courseId,
      mintSpecs: {
        collectionId: env.MINT_COLLECTION_ID,
        itemId,
        owner: env.SIGNER_ACCOUNT_ID,
        deadline: 0,
        minted: false,
      },
    });

    // Update Completed Course with/out no mistakes (Achievements).
    const answers = await ProgressModel.find({ courseId, userId }).countDocuments();
    const mistakes = await ProgressModel.find({ courseId, userId, isCorrect: false }).countDocuments();
    await finishOneCourse(userId, answers, mistakes);

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

    return res.status(200).send(certificates);
  } catch (e) {
    console.error(`[ERROR][getCertificates] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Certificates not found",
    },
  });
};

export const mintCertificate = async (req: Request, res: Response) => {
  const { certificateName, certificateId, deadline } = req.body;
  const userId = res.locals?.populatedUser?._id;
  try {
    if (!certificateName || !certificateId || !userId || !deadline) {
      return res.status(400).send({ error: { message: "Missing certificateName, certificateId, userId or deadline" } });
    }

    const query = {
      _id: new ObjectId(certificateId as string),
      userId: new ObjectId(userId as string),
    };
    const certificate = await CertificateModel.findOne(query);
    if (certificate) {
      const mintSpecs: MintSpecs = {
        ...certificate.mintSpecs,
        deadline: parseInt(deadline || "0"),
      };
      const { signature, payload } = await signMintPayload(certificateName, certificateId, mintSpecs);
      return res.status(200).send({ signature, payload });
    }
  } catch (e) {
    console.error(`[ERROR][mintCertificate] ${JSON.stringify(e)}`);
  }

  return res.status(400).send({
    error: {
      message: "Certificate not found/minted",
    },
  });
};
