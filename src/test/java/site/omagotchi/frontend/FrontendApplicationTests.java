package site.omagotchi.frontend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
class FrontendApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void contextLoads() {
	}

	@Test
	void landingPageIsRendered() throws Exception {
		mockMvc.perform(get("/"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/public/index"))
				.andExpect(content().string(containsString("시작하기")));

		mockMvc.perform(get("/index"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/public/index"))
				.andExpect(content().string(containsString("시작하기")));
	}

	@Test
	void staticResourcesAreServed() throws Exception {
		mockMvc.perform(get("/css/common.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/css/index.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/css/home.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/css/studyRecords.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/css/appPages.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/css/progress.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/css/space.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/app.js"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/home.js"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/write.js"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/progress.js"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/space.js"))
				.andExpect(status().isOk());
	}

	@Test
	void homePageIsRendered() throws Exception {
		mockMvc.perform(get("/home"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/app/home"))
				.andExpect(content().string(containsString("오늘 출석")));
	}

	@Test
	void homeMenuPagesAreRendered() throws Exception {
		mockMvc.perform(get("/progress"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/app/progress"))
				.andExpect(content().string(containsString("보상 받기")));

		mockMvc.perform(get("/personal"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/app/personal"))
				.andExpect(content().string(containsString("총 학습")));

		mockMvc.perform(get("/cohort"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/app/cohort"))
				.andExpect(content().string(containsString("기수 현황")));

		mockMvc.perform(get("/write"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/app/write"))
				.andExpect(content().string(containsString("학습 기록")));

		mockMvc.perform(get("/settings"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/app/settings"))
				.andExpect(content().string(containsString("비밀번호 변경")));

		mockMvc.perform(get("/help"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/app/help"))
				.andExpect(content().string(containsString("기본 사용 흐름")));
	}

	@Test
	void spacePageIsRendered() throws Exception {
		mockMvc.perform(get("/space"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/app/space"))
				.andExpect(content().string(containsString("회의실 A")));
	}

	@Test
	void managerRegisterPageIsRendered() throws Exception {
		mockMvc.perform(get("/manager-register"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/manager/managerRegister"))
				.andExpect(content().string(containsString("소속 기관")));

		mockMvc.perform(get("/js/managerRegister.js"))
				.andExpect(status().isOk());
	}

	@Test
	void managerDashboardIsRendered() throws Exception {
		mockMvc.perform(get("/manager-dashboard"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/manager/managerDashboard"))
				.andExpect(content().string(containsString("배정받은 기수만 표시됩니다")));

		mockMvc.perform(get("/css/managerDashboard.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/css/managerAuth.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/managerDashboard.js"))
				.andExpect(status().isOk());
	}

	@Test
	void actuatorHealthIsUp() throws Exception {
		mockMvc.perform(get("/actuator/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("UP"));
	}
}
