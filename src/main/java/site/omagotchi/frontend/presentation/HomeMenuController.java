package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeMenuController {
    // 퀘스트
    @GetMapping("/progress")
    public String progress() {
        return "pages/app/progress";
    }
    // 내 정보
    @GetMapping("/personal")
    public String personal() {
        return "pages/app/personal";
    }
    // 기수
    @GetMapping("/cohort")
    public String cohort() {
        return "pages/app/cohort";
    }
    // 기록
    @GetMapping("/write")
    public String write() {
        return "pages/app/write";
    }
    // 설정
    @GetMapping("/settings")
    public String settings() {
        return "pages/app/settings";
    }
    // 도움말
    @GetMapping("/help")
    public String help() {
        return "pages/app/help";
    }
}
