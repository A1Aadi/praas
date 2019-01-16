import React from 'react';
import { connect } from 'react-redux';
import { Link } from '@reach/router';
import PropTypes from 'prop-types';

import { cx } from 'tiny';

import style from './signup.scss';
import Alert from 'components/alert';

class Signup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitted: false,
      user: {
        firstName: '', email: '', password: ''
      }
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  };

  handleChange(event) {
    const { name, value } = event.target;
    const { user } = this.state;
    this.setState({
      user: {
        ...user,
        [name]: value
      }
    });
  };

  handleSubmit(event) {
    event.preventDefault();
    this.setState({ submitted: true });
    const { user } = this.state;

    if (user.firstName && user.password) {
      this.props.onSubmit({ user });
    }
  }

  render() {
    const { alert, inflight } = this.props;

    // const { user, submitted } = this.state;
    const classes = cx(['submit', { 'spinner': inflight }]);
    return (
      <div>
        <form onSubmit={this.handleSubmit} className={style.signup}>
          <h2 className={style.header}>Create your account</h2>
          <Alert klass={alert.klass} message={alert.message} />
          <input onChange={this.handleChange}
            type="text" name="firstName"
            placeholder="first name" required />
          <input onChange={this.handleChange}
            type="text" name="email"
            placeholder="email" required />
          <input onChange={this.handleChange}
            type="password" name="password"
            placeholder="password" required />
          <button type="submit" className={classes} >Sign up</button>
          <Link to="/login" className={style.cancelBtn}>Cancel</Link>
        </form>
      </div>
    );
  };
};

const mapStateToProps = (state, _ownProps) => ({
  alert: state.alert
});

Signup.propTypes = {
  alert: PropTypes.object.isRequired,
  onSubmit: PropTypes.func.isRequired,
  inflight: PropTypes.bool.isRequired
};

export default connect(mapStateToProps)(Signup);
