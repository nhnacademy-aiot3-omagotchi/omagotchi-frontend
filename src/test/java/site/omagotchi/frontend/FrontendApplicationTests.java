package site.omagotchi.frontend;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class FrontendApplicationTests {

	@Autowired
	private MockMvc mockMvc;
	@Autowired
	private WebApplicationContext applicationContext;
	private MockMvc unfilteredMockMvc;
	private MockMvc securityMockMvc;

	@BeforeEach
	void setUpUnfilteredMockMvc() {
		unfilteredMockMvc = MockMvcBuilders
				.webAppContextSetup(applicationContext)
				.build();
		securityMockMvc = MockMvcBuilders
				.webAppContextSetup(applicationContext)
				.apply(springSecurity())
				.build();
	}

	@Test
	@DisplayName("시작 화면 Route는 index Template 반환")
	void landingPageIsRendered() throws Exception {
		mockMvc.perform(get("/"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/public/index"));

		mockMvc.perform(get("/index"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/public/index"));
	}

	@Test
	@DisplayName("인증되지 않은 관리자 Dashboard 요청은 Login으로 이동")
	void managerDashboardRequiresAuthentication() throws Exception {
		mockMvc.perform(get("/manager-dashboard"))
				.andExpect(status().is3xxRedirection())
				.andExpect(redirectedUrl("/login"));
	}

	@Test
	@DisplayName("관리자 Dashboard Route는 Module Dashboard 반환")
	void managerDashboardUsesModularView() throws Exception {
		unfilteredMockMvc.perform(get("/manager-dashboard"))
				.andExpect(status().isOk())
				.andExpect(view().name("manager/dashboard/index"));

		mockMvc.perform(get("/css/managerDashboard.css"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/manager/dashboard/index.js"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/manager/dashboard/popups/studyDetailModal.js"))
				.andExpect(status().isOk());
	}

	@Test
	@DisplayName("계정 설정 Page의 인증 보호와 전용 View")
	void accountSettingsPageIsProtectedAndRendered() throws Exception {
		// When: 제거된 공용 설정 Page 요청
		// Then: 미등록 경로 응답
		unfilteredMockMvc.perform(get("/settings"))
				.andExpect(status().isNotFound());

		// When: 인증 없는 계정 설정 Page 요청
		// Then: Login Page 이동
		securityMockMvc.perform(get("/settings/account"))
				.andExpect(status().is3xxRedirection())
				.andExpect(redirectedUrl("/login"));

		// When: 인증된 계정 설정 Page 요청
		// Then: 전용 View와 읽기 전용 이메일 표시
		unfilteredMockMvc.perform(get("/settings/account"))
				.andExpect(status().isOk())
				.andExpect(view().name("pages/auth/accountSettings"))
				.andExpect(content().string(org.hamcrest.Matchers.containsString(
						"data-account-settings"
				)))
				.andExpect(content().string(org.hamcrest.Matchers.containsString(
						"/js/accountSettings.js"
				)))
				.andExpect(content().string(org.hamcrest.Matchers.containsString(
						"data-settings-email"
				)))
				.andExpect(content().string(org.hamcrest.Matchers.containsString(
						"href=\"/home?overlay=settings\""
				)))
				.andExpect(content().string(org.hamcrest.Matchers.not(
						org.hamcrest.Matchers.containsString("type=\"email\"")
				)));

		// Then: 계정 설정 JavaScript 정적 Resource 제공
		mockMvc.perform(get("/js/accountSettings.js"))
				.andExpect(status().isOk());
	}

	@Test
	@DisplayName("시스템 관리자 Dashboard는 SYSTEM_ADMIN에게만 전용 View를 반환")
	void systemAdminDashboardRequiresSystemAdminRole() throws Exception {
		securityMockMvc.perform(get("/system-admin-dashboard"))
				.andExpect(status().is3xxRedirection())
				.andExpect(redirectedUrl("/login"));

		securityMockMvc.perform(get("/system-admin-dashboard")
					.with(authenticatedUser(
							"11111111-1111-1111-1111-111111111111",
							GlobalRole.USER
					)))
				.andExpect(status().isForbidden());

		securityMockMvc.perform(get("/system-admin-dashboard")
					.with(authenticatedUser(
							"22222222-2222-2222-2222-222222222222",
							GlobalRole.SYSTEM_ADMIN
					)))
				.andExpect(status().isOk())
				.andExpect(view().name("system-admin/dashboard/index"))
				.andExpect(model().attribute(
						"systemAdminIdentifier",
						"22222222-2222-2222-2222-222222222222"
				))
				.andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"_csrf\"")))
				.andExpect(content().string(org.hamcrest.Matchers.containsString(
						"22222222-2222-2222-2222-222222222222"
				)))
				.andExpect(content().string(org.hamcrest.Matchers.not(
						org.hamcrest.Matchers.containsString("test@test.com")
				)));

		mockMvc.perform(get("/js/system-admin/dashboard/index.js"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/system-admin/dashboard/data/systemAdminApiRepository.js"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/js/system-admin/dashboard/data/systemAdminMockRepository.js"))
				.andExpect(status().isOk());
	}

	@Test
	@DisplayName("Actuator Health 상태 UP")
	void actuatorHealthIsUp() throws Exception {
		mockMvc.perform(get("/actuator/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	@DisplayName("전용 Template이 없는 ERROR dispatch는 상태 계열 오류 View 반환")
	void errorDispatchUsesStatusSeriesFallbackView() throws Exception {
		mockMvc.perform(get("/error")
				.accept(MediaType.TEXT_HTML)
				.with(errorDispatch(405)))
				.andExpect(status().isMethodNotAllowed())
				.andExpect(view().name("error/4xx"));

		mockMvc.perform(get("/error")
				.accept(MediaType.TEXT_HTML)
				.with(errorDispatch(503)))
				.andExpect(status().isServiceUnavailable())
				.andExpect(view().name("error/5xx"));
	}

	private static RequestPostProcessor errorDispatch(int status) {
		return request -> {
			request.setDispatcherType(DispatcherType.ERROR);
			request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, status);
			request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/test/error");
			return request;
		};
	}

	private static RequestPostProcessor authenticatedUser(String userId, GlobalRole globalRole) {
		UUID parsedUserId = UUID.fromString(userId);
		BrowserSessionTokenBundle tokenBundle = new BrowserSessionTokenBundle(
				parsedUserId,
				globalRole,
				"test-access-token",
				Instant.parse("2099-01-01T00:00:00Z"),
				"test-refresh-token",
				Instant.parse("2099-01-02T00:00:00Z")
		);
		UsernamePasswordAuthenticationToken authentication =
				UsernamePasswordAuthenticationToken.authenticated(
						userId,
						null,
						List.of(new SimpleGrantedAuthority("ROLE_" + globalRole.name()))
				);
		authentication.setDetails(tokenBundle);
		return authentication(authentication);
	}

}
