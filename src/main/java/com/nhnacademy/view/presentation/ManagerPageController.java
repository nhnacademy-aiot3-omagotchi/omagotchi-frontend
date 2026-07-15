package com.nhnacademy.view.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ManagerPageController {
    @GetMapping("/managerLogin")
    public String managerLoginPage() {
        return "managerLogin";
    }
}
