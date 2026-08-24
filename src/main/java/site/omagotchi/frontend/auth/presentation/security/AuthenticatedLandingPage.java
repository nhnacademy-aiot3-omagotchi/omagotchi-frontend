package site.omagotchi.frontend.auth.presentation.security;

import org.springframework.security.core.Authentication;

public final class AuthenticatedLandingPage {

    private static final String SYSTEM_ADMIN_AUTHORITY = "ROLE_SYSTEM_ADMIN";
    private static final String SYSTEM_ADMIN_DASHBOARD = "/system-admin-dashboard";
    private static final String USER_HOME = "/home";

    private AuthenticatedLandingPage() {
    }

    public static String resolve(Authentication authentication) {
        if (authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> SYSTEM_ADMIN_AUTHORITY.equals(authority.getAuthority()))) {
            return SYSTEM_ADMIN_DASHBOARD;
        }
        return USER_HOME;
    }
}
