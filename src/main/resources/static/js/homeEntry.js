export function resolveHomeEntry(profile, todayAttendance) {
    if (!profile?.currentCharacter) {
        return "/character-selector";
    }

    if (!profile?.approvedCohort?.cohortId) {
        return "/home";
    }

    return todayAttendance?.checkedInAt ? "/home" : "/check-in";
}
