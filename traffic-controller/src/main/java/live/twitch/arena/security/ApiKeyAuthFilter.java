package live.twitch.arena.security;

import org.springframework.security.web.authentication.preauth.AbstractPreAuthenticatedProcessingFilter;

import javax.servlet.http.HttpServletRequest;


public class ApiKeyAuthFilter extends AbstractPreAuthenticatedProcessingFilter {
    private final String principalRequestHeader;

    public ApiKeyAuthFilter(String principalRequestHeader) {
        super();
        this.principalRequestHeader = principalRequestHeader;
    }

    @Override
    protected Object getPreAuthenticatedPrincipal(HttpServletRequest request) {
        return request.getHeader(principalRequestHeader);
    }

    @Override
    protected Object getPreAuthenticatedCredentials(HttpServletRequest request) {
        return "N/A";
    }
}
