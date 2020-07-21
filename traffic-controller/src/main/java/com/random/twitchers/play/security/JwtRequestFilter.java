package com.random.twitchers.play.security;

import com.random.twitchers.play.TrafficWebsocketsHandler;
import io.jsonwebtoken.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(TrafficWebsocketsHandler.class);
    private static final String JWT_SECRET_ENV = "PRESENTER_SUPER_SECRET";
    private static final String jwtSecret = System.getenv(JWT_SECRET_ENV);

    @Override
    protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        final String requestTokenHeader = request.getHeader("Authorization");
        assert jwtSecret != null && !jwtSecret.isEmpty();
        if (requestTokenHeader != null && requestTokenHeader.startsWith("Bearer ")) {
            String jwtToken = requestTokenHeader.substring("Bearer ".length());
            if (JwtRequestFilter.verifyJwt(jwtToken)) {
                PreAuthenticatedAuthenticationToken token = new PreAuthenticatedAuthenticationToken(
                        "homeServer",
                        jwtSecret
                );
                token.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                token.setAuthenticated(true);
                SecurityContextHolder.getContext().setAuthentication(token);
            }
        }
        chain.doFilter(request, response);
    }

    public static boolean verifyJwt(String jwt) {
        try {
            JwtRequestFilter.parseJwt(jwt);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    public static Jws<Claims> parseJwt(String jwt) throws JwtException {
        return Jwts.parserBuilder()
            .setSigningKey(jwtSecret.getBytes(StandardCharsets.UTF_8))
            .build()
            .parseClaimsJws(jwt);
    }
}