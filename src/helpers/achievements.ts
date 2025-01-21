import { DocumentType } from "@typegoose/typegoose";
import { User, UserModel } from "@/models/User";

const setDefaultValues = async (user: DocumentType<User>) => {
  if (!user.achievementsTracker) {
    user.achievementsTracker = {
      loginCounter: 1,
      lastLogin: new Date(),
      answerCounter: 0,
      challengeCounter: 0,
      finishOneCourse: false,
      finishOneCourseNoMistakes: false,
      totalFocus: false,
    };
    await user.save();
  }
};

// LastLogin : 01/20/2025 15:55:23
// Now(case1): 01/20/2025 16:00:00
// Now(case2): 01/21/2025 13:00:00
// Now(case3): 01/25/2025 13:00:00
export const countLogins = async (userId: string) => {
  const user = await UserModel.findOne({ _id: userId });
  if (user) {
    // Be sure that we have at least the default values set.
    await setDefaultValues(user);

    const now = new Date();
    const loginDate = user.achievementsTracker.lastLogin;

    // Nothing to do if same day/month (case1)
    if (now.getDate() === loginDate.getDate() && now.getMonth() === loginDate.getMonth()) return;

    const oneDayLogin = loginDate;
    oneDayLogin.setDate(oneDayLogin.getDate() + 1);

    let loginCounter = 1;

    // (case2)
    if (now.getDate() === oneDayLogin.getDate()) loginCounter = user.achievementsTracker.loginCounter + 1;
    // else, reset it (case3) -> loginCounter = 1

    user.achievementsTracker = {
      ...user.achievementsTracker,
      loginCounter,
      lastLogin: now,
    };

    await user.save();
  }
};

export const countCorrectAnswers = async (userId: string, isCorrect: boolean) => {
  const user = await UserModel.findOne({ _id: userId });
  if (user) {
    // Be sure that we have at least the default values set.
    await setDefaultValues(user);

    let answerCounter = 0;
    if (isCorrect) answerCounter = user.achievementsTracker.answerCounter + 1;
    // else reset it back to answerCounter = 0;

    user.achievementsTracker = {
      ...user.achievementsTracker,
      answerCounter,
    };

    await user.save();
  }
};

export const finishOneCourse = async (userId: string, noMistakes: boolean) => {
  const user = await UserModel.findOne({ _id: userId });
  if (user) {
    // Be sure that we have at least the default values set.
    await setDefaultValues(user);

    user.achievementsTracker = {
      ...user.achievementsTracker,
      finishOneCourse: true,
      finishOneCourseNoMistakes: noMistakes,
    };

    await user.save();
  }
};
