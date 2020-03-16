import $ from "jquery";
import skinDefault from "./skinDefault.js";

const skinDarkMixin = {
  menu_active_bg_color: {
    default: "#0ca4ba"
  },

  content_wrapper: {
    default: "#515151"
  },

  main_header_bg_color: {
    default: "#828282"
  },
  main_border_color: {
    default: "#1f2d3d"
  },
  left_sidebar_bg_color: {
    default: "#828282"
  },
  left_sidebar_border_color: {
    default: "#1f2d3d"
  },
  customizer_options_bg_color: {
    default: "#828282"
  },
  breadcrumb_bg_color: {
    default: "#8E8E90"
  },
  btn_default_bg_color: {
    default: "#7e7e7e"
  },
  btn_default_color: {
    default: "#e3e3e3"
  },
  btn_default_border_color: {
    default: "#5f5f5f"
  },
  a_color: {
    default: "#ffffff"
  },
  a_color_hover: {
    default: "#d5d5d5"
  },
  card_header_bg_color: {
    default: "#73979d"
  },
  card_body_bg_color: {
    default: "#6c6c6c"
  },
  control_label_color: {
    default: "#d9d9d9"
  },
  help_block_color: {
    default: "#a3a3a3"
  },
  text_color: {
    default: "#cccccc"
  },
  table_border_color: {
    default: "#8d8d8d"
  },

  highlight_tr_hover_color: {
    default: "#474747"
  },
  selected_color: {
    default: "#0a2a00"
  },
  background_active_color: {
    default: "#6c6c6c"
  },
  background_passiv_color: {
    default: "#909090"
  },
  text_header_color: {
    default: "#c2c7d0"
  },

  background_default_color: {
    default: "#838383"
  },
  ico_default_color: {
    default: "#bebebe"
  },
  card_footer_bg_color: {
    default: "#6c6c6c"
  },

  boolean_false_color: {
    default: "#949494"
  },
  boolean_true_color: {
    default: "#21d703"
  },
  modal_bg_color: {
    default: "#515151"
  },
  api_sections_bg_color: {
    default: "#6c6c6c"
  },
  api_sections_border_color: {
    default: "#8d8d8d"
  },

  prettify_com_color: {
    default: "#93a1a1"
  },
  prettify_lit_color: {
    default: "#0DDBDE"
  },
  prettify_fun_color: {
    default: "#FAED5C"
  },
  prettify_str_color: {
    default: "#E8EC09"
  },
  prettify_kwd_color: {
    default: "#3DC2F5"
  },
  prettify_var_color: {
    default: "#12F39C"
  },
  prettify_pln_color: {
    default: "#C2C2C7"
  }
};

export default $.extend(true, {}, skinDefault, skinDarkMixin);
