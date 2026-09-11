/**
 * Hand-written to match supabase/migrations/*.sql exactly.
 *
 * Once a real Supabase project exists, regenerate this file for free with:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 * and it will supersede this file column-for-column.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Reduces `{ Row; Insert; Update }` boilerplate — Insert/Update default to a
 * partial of Row, which is close enough for app code; regenerated types will
 * be exact.
 *
 * `Relationships` must be present (even empty) — the supabase-js generics
 * constrain each table to `GenericTable`, which requires it; omitting it
 * silently collapses every query's inferred type to `never`.
 */
type Table<Row, InsertOverride extends object = object, UpdateOverride extends object = object> = {
  Row: Row;
  Insert: Partial<Row> & InsertOverride;
  Update: Partial<Row> & UpdateOverride;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
        preferred_language: "ar" | "en";
        theme: "dark" | "light";
        account_status: "active" | "suspended";
        created_at: string;
        updated_at: string;
        last_active_at: string | null;
      }>;
      admin_profiles: Table<{
        user_id: string;
        role: "admin" | "super_admin";
        status: "active" | "suspended";
        require_password_change: boolean;
        created_by: string | null;
        created_at: string;
        updated_at: string;
        last_login_at: string | null;
      }>;
      admin_permissions: Table<{
        id: string;
        admin_user_id: string;
        permission: string;
        created_at: string;
      }>;
      subscription_plans: Table<{
        id: string;
        slug: string;
        name_ar: string;
        name_en: string;
        description_ar: string;
        description_en: string;
        price_iqd: number;
        billing_period: "monthly" | "yearly";
        duration_days: number;
        active: boolean;
        featured: boolean;
        display_order: number;
        limits: Json;
        features: Json;
        created_at: string;
        updated_at: string;
      }>;
      activation_codes: Table<{
        id: string;
        code: string;
        plan_id: string;
        duration_days: number;
        status: "available" | "used" | "expired" | "disabled";
        created_by: string | null;
        created_at: string;
        expires_at: string | null;
        used_by: string | null;
        used_at: string | null;
        notes: string | null;
      }>;
      subscriptions: Table<{
        id: string;
        user_id: string;
        plan_id: string;
        status: "pending" | "active" | "expired" | "cancelled" | "suspended";
        price_iqd: number;
        start_date: string | null;
        expiry_date: string | null;
        activation_source: "activation_code" | "manual" | "promotion" | null;
        activation_code_id: string | null;
        activated_by: string | null;
        payment_id: string | null;
        created_at: string;
        cancelled_at: string | null;
        cancel_reason: string | null;
        notes: string | null;
      }>;
      trial_usage: Table<{
        user_id: string;
        used: boolean;
        used_at: string | null;
        project_id: string | null;
        video_id: string | null;
        reset_count: number;
        last_reset_by: string | null;
        last_reset_reason: string | null;
      }>;
      payments: Table<{
        id: string;
        user_id: string;
        subscription_id: string | null;
        amount_iqd: number;
        method: "manual" | "bank_transfer" | "mastercard" | "zaincash" | "asiahawala" | "other";
        reference: string | null;
        status: "pending" | "verified" | "rejected" | "refunded";
        paid_at: string;
        verified_by: string | null;
        verified_at: string | null;
        notes: string | null;
      }>;
      projects: Table<{
        id: string;
        owner_id: string;
        prompt: string;
        language: "ar" | "en" | null;
        business_name: string | null;
        offer: string | null;
        price: string | null;
        style: string | null;
        platform: string | null;
        aspect_ratio: "9:16" | "16:9" | "1:1" | null;
        duration_seconds: number | null;
        status: "draft" | "planning" | "generating" | "ready" | "rendering" | "failed";
        brief: Json | null;
        scene_plan: Json | null;
        created_at: string;
        updated_at: string;
      }>;
      project_assets: Table<{
        id: string;
        project_id: string;
        owner_id: string;
        kind: "product" | "logo" | "reference" | "video";
        storage_path: string;
        mime_type: string | null;
        size_bytes: number | null;
        metadata: Json | null;
        created_at: string;
      }>;
      project_revisions: Table<{
        id: string;
        project_id: string;
        user_id: string;
        instruction: string;
        previous_state: Json | null;
        resulting_state: Json | null;
        created_at: string;
      }>;
      videos: Table<{
        id: string;
        project_id: string;
        owner_id: string;
        status: "processing" | "ready" | "failed";
        duration_seconds: number | null;
        aspect_ratio: "9:16" | "16:9" | "1:1" | null;
        resolution: "1080p" | "2k" | "4k";
        format: string;
        storage_path: string | null;
        file_size_mb: number | null;
        created_at: string;
      }>;
      ai_jobs: Table<{
        id: string;
        user_id: string;
        project_id: string | null;
        operation:
          | "prompt_analysis"
          | "brief_generation"
          | "script_generation"
          | "scene_planning"
          | "revision"
          | "image_generation"
          | "video_generation"
          | "voice_generation";
        provider: string | null;
        model: string | null;
        status: "queued" | "processing" | "succeeded" | "failed";
        tokens_used: number | null;
        generated_units: number | null;
        cost_usd: number | null;
        cost_iqd: number | null;
        error_message: string | null;
        input_summary: string | null;
        created_at: string;
        completed_at: string | null;
      }>;
      render_jobs: Table<{
        id: string;
        user_id: string;
        project_id: string | null;
        video_id: string | null;
        provider: string | null;
        status: "queued" | "processing" | "succeeded" | "failed";
        resolution: "1080p" | "2k" | "4k" | null;
        format: string;
        render_seconds: number | null;
        estimated_cost_iqd: number | null;
        error_message: string | null;
        server: string | null;
        created_at: string;
        completed_at: string | null;
      }>;
      usage_events: Table<{
        id: string;
        user_id: string;
        project_id: string | null;
        subscription_id: string | null;
        event_type:
          | "video_generation"
          | "text_tokens_input"
          | "text_tokens_output"
          | "image_generation"
          | "video_ai_seconds"
          | "voice_seconds"
          | "render_seconds"
          | "storage_bytes";
        quantity: number;
        unit: string | null;
        provider: string | null;
        cost_usd: number | null;
        metadata: Json | null;
        created_at: string;
      }>;
      support_tickets: Table<{
        id: string;
        user_id: string;
        subject: string;
        category: string;
        priority: "low" | "normal" | "high" | "urgent";
        status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
        assigned_admin: string | null;
        created_at: string;
        last_reply_at: string;
      }>;
      support_messages: Table<{
        id: string;
        ticket_id: string;
        author_id: string;
        author_type: "user" | "admin";
        message: string;
        created_at: string;
      }>;
      admin_notes: Table<{
        id: string;
        entity_type: "user" | "subscription" | "payment" | "support_ticket";
        entity_id: string;
        author_id: string;
        note: string;
        created_at: string;
      }>;
      notifications: Table<{
        id: string;
        audience: "admin" | "user";
        user_id: string | null;
        type: string;
        title_ar: string;
        title_en: string;
        message_ar: string;
        message_en: string;
        read: boolean;
        created_at: string;
      }>;
      announcements: Table<{
        id: string;
        title_ar: string;
        title_en: string;
        message_ar: string;
        message_en: string;
        type: "info" | "success" | "warning" | "promotion" | "maintenance";
        location: "homepage" | "dashboard" | "subscription" | "global";
        start_at: string | null;
        end_at: string | null;
        dismissible: boolean;
        enabled: boolean;
        audience: "all" | "trial" | "active_subscribers" | "monthly" | "yearly" | "specific";
        created_at: string;
        updated_at: string;
        updated_by: string | null;
      }>;
      homepage_settings: Table<{ id: number; hero: Json; updated_at: string; updated_by: string | null }>;
      homepage_sections: Table<{
        id: string;
        enabled: boolean;
        title_ar: string;
        title_en: string;
        description_ar: string;
        description_en: string;
        display_order: number;
      }>;
      examples: Table<{
        id: string;
        title_ar: string;
        title_en: string;
        description_ar: string;
        description_en: string;
        category: string;
        thumbnail_gradient: string | null;
        video_url: string | null;
        style_hint: string | null;
        prompt_example: string | null;
        featured: boolean;
        display_order: number;
        active: boolean;
      }>;
      faq_items: Table<{
        id: string;
        question_ar: string;
        question_en: string;
        answer_ar: string;
        answer_en: string;
        category: string | null;
        display_order: number;
        active: boolean;
      }>;
      developers: Table<{
        id: string;
        name_ar: string;
        name_en: string;
        job_title_ar: string;
        job_title_en: string;
        bio_ar: string;
        bio_en: string;
        photo_url: string | null;
        email: string | null;
        phone: string | null;
        whatsapp: string | null;
        skills: string[];
        featured: boolean;
        visible: boolean;
        display_order: number;
      }>;
      developer_links: Table<{
        id: string;
        developer_id: string;
        platform: "github" | "linkedin" | "website" | "instagram" | "x";
        url: string;
      }>;
      developer_page_settings: Table<{
        id: number;
        page_title_ar: string;
        page_title_en: string;
        intro_ar: string;
        intro_en: string;
        description_ar: string;
        description_en: string;
        cta_text_ar: string;
        cta_text_en: string;
        section_visible: boolean;
      }>;
      content_pages: Table<{
        id: string;
        slug: string;
        title_ar: string;
        title_en: string;
        content_ar: string;
        content_en: string;
        published: boolean;
        seo_title: string | null;
        seo_description: string | null;
        updated_at: string;
        updated_by: string | null;
      }>;
      legal_documents: Table<{
        id: string;
        type: "privacy_policy" | "terms_of_use" | "subscription_terms" | "refund_policy" | "cookie_policy";
        title_ar: string;
        title_en: string;
        content_ar: string;
        content_en: string;
        published: boolean;
        last_updated: string;
      }>;
      navigation_items: Table<{
        id: string;
        group_key: "desktop" | "footer";
        label_ar: string;
        label_en: string;
        href: string;
        enabled: boolean;
        display_order: number;
        open_new_tab: boolean;
        visibility: "public" | "authenticated" | "both";
      }>;
      footer_settings: Table<{
        id: number;
        short_description_ar: string;
        short_description_en: string;
        copyright_ar: string;
        copyright_en: string;
        support_phone: string | null;
        support_email: string | null;
        developer_credit_ar: string;
        developer_credit_en: string;
        visible: boolean;
      }>;
      social_links: Table<{
        id: string;
        platform: "instagram" | "tiktok" | "facebook" | "youtube" | "x" | "linkedin" | "telegram" | "whatsapp";
        url: string;
        enabled: boolean;
        label: string | null;
      }>;
      seo_settings: Table<{
        id: number;
        site_title: string;
        title_template: string;
        description_ar: string;
        description_en: string;
        keywords: string[];
        og_title: string | null;
        og_description: string | null;
        og_image_url: string | null;
        robots_index: boolean;
        robots_follow: boolean;
      }>;
      system_settings: Table<{
        id: number;
        business: Json;
        limits: Json;
        ai_providers: Json;
        rendering: Json;
        storage: Json;
        security: Json;
        maintenance: Json;
        kill_switches: Json;
        support_contact: Json;
        subscription_contact: Json;
        payment_contact: Json;
        updated_at: string;
      }>;
      feature_flags: Table<{
        id: string;
        label_ar: string;
        label_en: string;
        description: string;
        enabled: boolean;
        updated_at: string;
        updated_by: string | null;
      }>;
      email_templates: Table<{
        id: string;
        subject_ar: string;
        subject_en: string;
        body_ar: string;
        body_en: string;
      }>;
      email_settings: Table<{ id: number; sender_name: string; reply_to: string | null; support_email: string | null }>;
      assets: Table<{
        id: string;
        filename: string;
        category: "logo" | "brand" | "homepage" | "examples" | "developers" | "support" | "content" | "uploads";
        type: "image" | "video" | "document";
        storage_path: string;
        size_kb: number | null;
        width: number | null;
        height: number | null;
        usage_ref: string | null;
        uploaded_by: string | null;
        created_at: string;
      }>;
      audit_logs: Table<{
        id: string;
        admin_id: string | null;
        action: string;
        entity: string;
        entity_id: string | null;
        target_user: string | null;
        old_value: string | null;
        new_value: string | null;
        reason: string | null;
        metadata: Json | null;
        created_at: string;
      }>;
      // 008_settings_gaps.sql
      branding_settings: Table<{
        id: number;
        brand_name_ar: string;
        brand_name_en: string;
        tagline_ar: string;
        tagline_en: string;
        logo_url: string | null;
        logo_dark_url: string | null;
        logo_light_url: string | null;
        favicon_url: string | null;
        og_image_url: string | null;
        updated_at: string;
        updated_by: string | null;
      }>;
      about_page_settings: Table<{
        id: number;
        page_title_ar: string;
        page_title_en: string;
        intro_ar: string;
        intro_en: string;
        story_ar: string;
        story_en: string;
        mission_ar: string;
        mission_en: string;
        vision_ar: string;
        vision_en: string;
        values_ar: string;
        values_en: string;
        cta_text_ar: string;
        cta_text_en: string;
        updated_at: string;
        updated_by: string | null;
      }>;
      localization_settings: Table<{
        id: number;
        arabic_enabled: boolean;
        english_enabled: boolean;
        default_locale: "ar" | "en";
        currency_display: "IQD" | "USD" | "both";
        date_format: "gregorian" | "hijri_gregorian";
        updated_at: string;
        updated_by: string | null;
      }>;
      finance_cost_config: Table<{
        id: number;
        exchange_rate_usd_to_iqd: number;
        text_ai_cost_per_request_usd: number;
        image_ai_cost_per_image_usd: number;
        video_ai_cost_per_second_usd: number;
        voice_cost_per_second_usd: number;
        render_cost_per_minute_usd: number;
        storage_cost_per_gb_usd: number;
        bandwidth_cost_per_gb_usd: number;
        other_cost_per_video_usd: number;
        updated_at: string;
        updated_by: string | null;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: { check_uid?: string }; Returns: boolean };
      is_super_admin: { Args: { check_uid?: string }; Returns: boolean };
      has_permission: { Args: { perm: string; check_uid?: string }; Returns: boolean };
      can_generate: { Args: { check_uid?: string }; Returns: boolean };
      redeem_activation_code: { Args: { p_code: string }; Returns: Json };
      verify_payment_and_activate_subscription: { Args: { p_payment_id: string }; Returns: Json };
      consume_trial: { Args: { p_project_id?: string; p_video_id?: string }; Returns: Json };
      grant_trial: { Args: { p_user_id: string }; Returns: Json };
      reset_trial: { Args: { p_user_id: string; p_reason?: string }; Returns: Json };
    };
    Enums: Record<string, never>;
  };
};
