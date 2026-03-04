class SupervisorGuard {

  static async approve(decision) {
    if (decision.requiresHumanApproval) {
      console.log("Waiting human approval...");
      return false;
    }

    return true;
  }
}

module.exports = SupervisorGuard;