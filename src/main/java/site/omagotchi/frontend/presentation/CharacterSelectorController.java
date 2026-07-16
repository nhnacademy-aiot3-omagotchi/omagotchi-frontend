package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CharacterSelectorController {
    // 캐릭터 선택 화면
    @GetMapping("/characterSelector")
    public String characterSelector() {
        return "characterSelector";
    }
}
